import mongoose from "mongoose";
import { config } from "../server/config.js";
import { createStorage } from "../server/services/storage.js";
import { createAI } from "../server/services/ai.js";
import { createWorker } from "../server/services/jobs.js";
import { createApp } from "../server/app.js";

let application;
let connecting;

async function getApplication() {
  if (!config.mongo || config.secret.length < 32)
    throw new Error(
      "Vercel requires MONGODB_URI and JWT_SECRET with at least 32 characters.",
    );
  if (!["none", "blob", "s3"].includes(config.storage))
    throw new Error("STORAGE_DRIVER must be none, blob or s3.");
  if (config.storage === "blob" && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.warn(
      "BLOB_READ_WRITE_TOKEN is missing; continuing without original PDF storage.",
    );
    config.storage = "none";
  }
  if (config.storage === "s3" && !config.bucket) {
    console.warn("S3_BUCKET is missing; continuing without original PDF storage.");
    config.storage = "none";
  }
  // A cached serverless instance can outlive its MongoDB socket. Check the
  // connection on every invocation and allow a later request to recover from a
  // transient Atlas/network failure instead of retaining a rejected promise.
  if (mongoose.connection.readyState !== 1) {
    if (!connecting)
      connecting = mongoose.connect(config.mongo, {
        serverSelectionTimeoutMS: 8000,
      });
    try {
      await connecting;
    } finally {
      connecting = undefined;
    }
  }
  if (application) return application;
  const storage = createStorage();
  const ai = createAI();
  const worker = createWorker({ storage, ai });
  application = createApp({
    storage,
    ai,
    worker,
    options: { ...config, serverless: true },
  });
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
