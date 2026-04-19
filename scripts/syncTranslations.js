import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SOURCE_BASE_URL =
  "https://raw.githubusercontent.com/EuphoriaTheme/blueprint-translations/main";
const DEFAULT_REMOTE_PATHS = ["translations", "public/translations"];
const DEFAULT_TIMEOUT_MS = 10000;

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null || value === "")
    return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseCsv(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function fetchText(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "self-hostable-backend/translation-sync",
      },
    });

    if (response.status === 404) {
      return { status: 404, text: null };
    }

    if (!response.ok) {
      return { status: response.status, text: null };
    }

    return { status: response.status, text: await response.text() };
  } finally {
    clearTimeout(timeout);
  }
}

function parseGithubRawUrl(rawBaseUrl) {
  const rawPrefix = "https://raw.githubusercontent.com/";
  if (!rawBaseUrl.startsWith(rawPrefix)) return null;

  const remainder = rawBaseUrl
    .slice(rawPrefix.length)
    .split("/")
    .filter(Boolean);
  if (remainder.length < 3) return null;

  const [owner, repo, branch] = remainder;
  return { owner, repo, branch };
}

async function buildGithubFileMap(rawBaseUrl, timeoutMs, logger) {
  const parsed = parseGithubRawUrl(rawBaseUrl);
  if (!parsed) return null;

  const { owner, repo, branch } = parsed;
  const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  try {
    const response = await fetchText(treeUrl, timeoutMs);
    if (!response.text || response.status !== 200) {
      logger.warn(`GitHub tree lookup failed (HTTP ${response.status}).`);
      return null;
    }

    const payload = JSON.parse(response.text);
    if (!Array.isArray(payload.tree)) return null;

    const map = new Map();

    for (const item of payload.tree) {
      if (!item || item.type !== "blob" || typeof item.path !== "string")
        continue;
      const fileName = path.basename(item.path);
      if (!fileName.endsWith(".json")) continue;
      if (!map.has(fileName)) {
        map.set(fileName, item.path);
      }
    }

    return { map, owner, repo, branch };
  } catch (error) {
    logger.warn(`GitHub tree lookup error: ${error.message}`);
    return null;
  }
}

export async function syncBlueprintTranslations(options = {}) {
  const logger = options.logger || console;
  const autoFetchEnabled = parseBoolean(
    process.env.TRANSLATIONS_AUTO_FETCH,
    true,
  );

  if (!autoFetchEnabled) {
    logger.info(
      "Translation auto-fetch is disabled (TRANSLATIONS_AUTO_FETCH=false).",
    );
    return { skipped: true, reason: "disabled" };
  }

  const sourceBaseUrl = (
    process.env.TRANSLATIONS_SOURCE_BASE_URL || DEFAULT_SOURCE_BASE_URL
  ).replace(/\/$/, "");
  const remotePaths = parseCsv(process.env.TRANSLATIONS_REMOTE_PATHS);
  const sourcePaths =
    remotePaths.length > 0 ? remotePaths : DEFAULT_REMOTE_PATHS;
  const timeoutMs = Number(
    process.env.TRANSLATIONS_TIMEOUT_MS || DEFAULT_TIMEOUT_MS,
  );
  const githubLookupEnabled = parseBoolean(
    process.env.TRANSLATIONS_GITHUB_TREE_LOOKUP,
    true,
  );
  const translationsDir = path.join(__dirname, "../public/translations");

  await fs.mkdir(translationsDir, { recursive: true });

  const localFiles = (await fs.readdir(translationsDir)).filter((file) =>
    file.endsWith(".json"),
  );
  const explicitFiles = parseCsv(process.env.TRANSLATIONS_FILE_LIST);
  const filesToSync = explicitFiles.length > 0 ? explicitFiles : localFiles;

  if (filesToSync.length === 0) {
    logger.warn("No translation files found to sync.");
    return { skipped: true, reason: "no-files" };
  }

  let updated = 0;
  let missing = 0;
  let failed = 0;

  let githubFileMap = null;
  let githubSource = null;

  if (githubLookupEnabled) {
    const lookup = await buildGithubFileMap(sourceBaseUrl, timeoutMs, logger);
    if (lookup) {
      githubFileMap = lookup.map;
      githubSource = lookup;
    }
  }

  for (const fileName of filesToSync) {
    let downloaded = false;

    for (const remotePath of sourcePaths) {
      const normalizedPath = remotePath.replace(/^\/+|\/+$/g, "");
      const sourceUrl = `${sourceBaseUrl}/${normalizedPath}/${fileName}`;

      try {
        const result = await fetchText(sourceUrl, timeoutMs);

        if (result.status === 404) {
          continue;
        }

        if (!result.text) {
          logger.warn(
            `Could not fetch ${fileName} from ${sourceUrl} (HTTP ${result.status}).`,
          );
          failed += 1;
          break;
        }

        JSON.parse(result.text);
        const outputPath = path.join(translationsDir, fileName);
        await fs.writeFile(outputPath, result.text, "utf8");
        updated += 1;
        downloaded = true;
        break;
      } catch (error) {
        logger.warn(
          `Failed fetching ${fileName} from ${sourceUrl}: ${error.message}`,
        );
      }
    }

    if (
      !downloaded &&
      githubFileMap &&
      githubSource &&
      githubFileMap.has(fileName)
    ) {
      const sourcePath = githubFileMap.get(fileName);
      const fallbackUrl = `https://raw.githubusercontent.com/${githubSource.owner}/${githubSource.repo}/${githubSource.branch}/${sourcePath}`;

      try {
        const result = await fetchText(fallbackUrl, timeoutMs);
        if (result.text && result.status === 200) {
          JSON.parse(result.text);
          const outputPath = path.join(translationsDir, fileName);
          await fs.writeFile(outputPath, result.text, "utf8");
          updated += 1;
          downloaded = true;
        }
      } catch (error) {
        logger.warn(
          `GitHub fallback fetch failed for ${fileName}: ${error.message}`,
        );
        failed += 1;
      }
    }

    if (!downloaded) {
      missing += 1;
    }
  }

  logger.info(
    `Translation sync complete. Updated: ${updated}, Missing: ${missing}, Failed: ${failed}.`,
  );
  return { skipped: false, updated, missing, failed };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  syncBlueprintTranslations()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error("Translation sync failed:", error);
      process.exit(1);
    });
}
