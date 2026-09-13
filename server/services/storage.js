import fs from "node:fs/promises";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "../config.js";
export function createStorage(options = config) {
  const localPath = (key) => {
    if (!/^[a-zA-Z0-9-]+\.pdf$/.test(key))
      throw new Error("Invalid storage key");
    return path.join(options.dataDir, "uploads", key);
  };
  if (options.storage === "s3") {
    if (!options.bucket) throw new Error("S3_BUCKET is required");
    const client = new S3Client({
      endpoint: options.endpoint,
      region: process.env.AWS_REGION || "auto",
      forcePathStyle: true,
    });
    return {
      async put(key, body) {
        await client.send(
          new PutObjectCommand({
            Bucket: options.bucket,
            Key: key,
            Body: body,
            ContentType: "application/pdf",
          }),
        );
      },
      async get(key) {
        const r = await client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: key }),
        );
        return Buffer.from(await r.Body.transformToByteArray());
      },
      async delete(key) {
        await client.send(
          new DeleteObjectCommand({ Bucket: options.bucket, Key: key }),
        );
      },
    };
  }
  return {
    async put(key, body) {
      await fs.mkdir(path.dirname(localPath(key)), {
        recursive: true,
        mode: 0o700,
      });
      await fs.writeFile(localPath(key), body, { mode: 0o600 });
    },
    get: (key) => fs.readFile(localPath(key)),
    async delete(key) {
      await fs.rm(localPath(key), { force: true });
    },
  };
}
