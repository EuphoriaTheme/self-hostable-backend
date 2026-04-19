import fs from "fs";
import yaml from "js-yaml";
import path from "path";
import { fileURLToPath } from "url";
import queryFiveMServer from "../handlers/queryFiveMServer.js";
import queryBeamMPServer from "../handlers/queryBeamMPServer.js";
import queryMinecraftServer from "../handlers/queryMinecraftServer.js";
import handleDefaultGame from "../handlers/defaultGameHandler.js";

// Helper to get games list from YAML
function getGamesList() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const gamesPath = path.join(__dirname, "../public/games.yml");
  try {
    const file = fs.readFileSync(gamesPath, "utf8");
    const games = yaml.load(file) || {};
    return games;
  } catch {
    return {};
  }
}

export default async function gameApiRoutes(fastify) {
  // List all games from games.yml
  fastify.get("/", async () => {
    const games = getGamesList();
    return games;
  });

  // General Game server query - use wildcard to capture the full path
  fastify.get("/:game/*", async (request, reply) => {
    const { game } = request.params;
    const params = request.params["*"] || "";

    // Parse the parameters: ip=xxx&port=yyy
    const ipMatch = params.match(/ip=([^&]+)/);
    const portMatch = params.match(/port=(\d+)/);

    const ip = ipMatch ? ipMatch[1] : undefined;
    const port = portMatch ? portMatch[1] : undefined;

    const normalizedGame = game.toLowerCase();
    try {
      if (["fivem", "gta5f"].includes(normalizedGame)) {
        const result = await queryFiveMServer(ip, port);
        return result;
      }
      if (normalizedGame === "beammp") {
        const result = await queryBeamMPServer(ip, port);
        return { success: true, data: result };
      }
      if (normalizedGame === "minecraft") {
        const result = await queryMinecraftServer(ip, port);
        return result;
      }

      // Default handler for all other games
      const result = await handleDefaultGame(normalizedGame, ip, port);
      return result;
    } catch (error) {
      console.error(`Error processing request: ${error.message}`);
      reply.code(500);
      return { success: false, error: error.message };
    }
  });
}
