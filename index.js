import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import fastifyFormbody from "@fastify/formbody";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { syncBlueprintTranslations } from "./scripts/syncTranslations.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({ logger: true });

await syncBlueprintTranslations({ logger: app.log });

await app.register(fastifyCors);
await app.register(fastifyFormbody);
await app.register(fastifyStatic, {
  root: path.join(__dirname, "public"),
  prefix: "/public/",
});

import gameApiRoutes from "./routes/gameapi.js";
import translationApiRoutes from "./routes/translations.js";
import rconRoutes from "./routes/rcon.js";

await app.register(gameApiRoutes, { prefix: "/gameapi" });
await app.register(translationApiRoutes, { prefix: "/translations" });
await app.register(rconRoutes, { prefix: "/rcon" });

app.get("/", async () => "API Running");

const PORT = process.env.PORT || 3000;
try {
  await app.listen({ port: Number(PORT), host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
