import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
await fs.mkdir(new URL("../.data/mongo", import.meta.url), { recursive: true });
const mongo = await MongoMemoryServer.create({
  instance: {
    port: 27017,
    dbPath: fileURLToPath(new URL("../.data/mongo", import.meta.url)),
    storageEngine: "wiredTiger",
    dbName: "studyspace",
  },
});
console.log(
  "Local development MongoDB is running at mongodb://127.0.0.1:27017/studyspace. Data persists in .data/mongo.",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await mongo.stop();
    process.exit(0);
  });
