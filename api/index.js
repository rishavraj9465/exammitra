import mongoose from "mongoose";
import { config } from "../server/config.js";
import { createStorage } from "../server/services/storage.js";
import { createAI } from "../server/services/ai.js";
import { createWorker } from "../server/services/jobs.js";
import { createApp } from "../server/app.js";

let application;
let connecting;

async function getApplication() {
  if (application) return application;
  if (!config.mongo || config.secret.length < 32)
    throw new Error(
      "Vercel requires MONGODB_URI and JWT_SECRET with at least 32 characters.",
    );
  if (config.storage !== "s3")
    throw new Error("Vercel requires STORAGE_DRIVER=s3.");
  if (!connecting)
    connecting = mongoose.connect(config.mongo, {
      serverSelectionTimeoutMS: 8000,
    });
  await connecting;
  const storage = createStorage();
  const ai = createAI();
  const worker = createWorker({ storage, ai });
  application = createApp({ storage, ai, worker });
  return application;
}

export default async function handler(req, res) {
  try {
    const app = await getApplication();
    return app(req, res);
  } catch (error) {
    console.error("Vercel initialization failed:", error.message);
    return res.status(503).json({
      error: "The service could not start. Check the deployment environment variables.",
    });
  }
}
