import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
if (existsSync(path.join(root, ".env")))
  process.loadEnvFile(path.join(root, ".env"));
export const config = {
  port: Number(process.env.PORT || 5000),
  production: process.env.NODE_ENV === "production",
  mongo: process.env.MONGODB_URI || "",
  secret: process.env.JWT_SECRET || "",
  origin: process.env.CLIENT_URL || "http://127.0.0.1:5173",
  model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
  generationModel:
    process.env.GEMINI_GENERATION_MODEL || "gemini-3.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY || "",
  storage: process.env.STORAGE_DRIVER || "local",
  dataDir: process.env.DATA_DIR || path.join(root, ".data"),
  bucket: process.env.S3_BUCKET || "",
  endpoint: process.env.S3_ENDPOINT || undefined,
};
