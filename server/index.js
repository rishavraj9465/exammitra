import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { config } from "./config.js";
import { createStorage } from "./services/storage.js";
import { createAI } from "./services/ai.js";
import { createWorker } from "./services/jobs.js";
import { createApp } from "./app.js";
if (config.production && (!config.mongo || config.secret.length < 32))
  throw new Error(
    "Production requires MONGODB_URI and JWT_SECRET (at least 32 characters).",
  );
if (!config.secret) {
  config.secret = randomBytes(32).toString("hex");
  console.log(
    "Temporary development session key: sign-ins reset when the server restarts. Set JWT_SECRET to persist sessions.",
  );
}
mongoose.set("bufferCommands", false);
const storage = createStorage();
const ai = createAI();
const worker = createWorker({ storage, ai });
let stopWorker;
if (config.mongo) {
  try {
    await mongoose.connect(config.mongo, { serverSelectionTimeoutMS: 8000 });
    stopWorker = await worker.start();
    console.log("Database connected.");
  } catch {
    console.error(
      "Database connection failed. Check MONGODB_URI; the sample remains available.",
    );
  }
} else console.log("MONGODB_URI is missing. Sample mode is available.");
const app = createApp({ storage, ai, worker });
const server = app.listen(
  config.port,
  config.production ? "0.0.0.0" : "127.0.0.1",
  () => console.log(`ExamMitra AI API: http://127.0.0.1:${config.port}`),
);
const shutdown = () => {
  stopWorker?.();
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
