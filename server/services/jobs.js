import { Pack, Job } from "../models.js";
import { extractPdf } from "./pdf.js";
import { publicAIError } from "./ai.js";
export function createWorker({ storage, ai, extract = extractPdf }) {
  let running = false,
    stopped = false;
  async function tick() {
    if (running || stopped) return;
    running = true;
    try {
      const job = await Job.findOneAndUpdate(
        { status: "queued" },
        { $set: { status: "reading", stage: "Reading your PDF", error: "" } },
        { new: true, sort: { createdAt: 1 } },
      );
      if (!job) return;
      try {
        const pack = await Pack.findOne({
          _id: job.pack,
          deleted: false,
        }).select("+pages");
        if (!pack) {
          await Job.deleteOne({ _id: job._id });
          return;
        }
        await Pack.updateOne(
          { _id: pack._id, deleted: false },
          { status: "reading", error: "" },
        );
        const pages = pack.pages?.length
          ? pack.pages
          : await extract(await storage.get(pack.fileKey));
        const updated = await Pack.updateOne(
          { _id: pack._id, deleted: false },
          { pages, pageCount: pages.length, status: "generating" },
        );
        if (!updated.matchedCount) return;
        await Job.updateOne(
          { _id: job._id },
          { status: "generating", stage: "Generating your study pack" },
        );
        const content = await ai.generate(
          pages,
          pack.detail,
          async (done, total) => {
            if (!(await Pack.exists({ _id: pack._id, deleted: false })))
              throw new Error("Pack deleted");
            await Job.updateOne(
              { _id: job._id },
              {
                completedChunks: done,
                totalChunks: total,
                stage:
                  done === total
                    ? "Putting your study pack together"
                    : `Understanding section ${done + 1} of ${total}`,
              },
            );
          },
        );
        await Pack.updateOne(
          { _id: pack._id, deleted: false },
          { content, status: "ready", error: "" },
        );
        await Job.updateOne(
          { _id: job._id },
          { status: "ready", stage: "Ready to study" },
        );
      } catch (e) {
        const error =
          /PDF|page|text|password|scanned|configured|retry|usage limit|timed out/i.test(
            e.message,
          )
            ? e.message
            : publicAIError(e);
        await Pack.updateOne(
          { _id: job.pack, deleted: false },
          { status: "failed", error },
        );
        await Job.updateOne(
          { _id: job._id },
          { status: "failed", error, stage: "Needs attention" },
        );
      }
    } finally {
      running = false;
    }
  }
  return {
    tick,
    async start() {
      await Job.updateMany(
        { status: { $in: ["reading", "generating"] } },
        { status: "queued", stage: "Resuming processing" },
      );
      stopped = false;
      const interval = setInterval(
        () => tick().catch((e) => console.error("Worker error:", e.name)),
        1500,
      );
      tick().catch(() => {});
      return () => {
        stopped = true;
        clearInterval(interval);
      };
    },
  };
}
