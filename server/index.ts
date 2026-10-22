import "dotenv/config";
import express from "express";
import path from "node:path";
import { openDatabase } from "./repository.js";
import { createApi } from "./app.js";

const db = await openDatabase(path.resolve(process.env.DATA_DIR ?? ".data"));
const app = express();
app.use("/api", createApi(db));
const production = process.argv.includes("--production");
if (production) {
  app.use(express.static(path.resolve("dist")));
  app.get("/{*path}", (_req, res) => res.sendFile(path.resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT ?? 5173);
const server = app.listen(port, "127.0.0.1", () => console.log(`Aljami Cerdas: http://localhost:${port}`));
process.on("SIGINT", () => { server.close(); void db.close().then(() => process.exit(0)); });
