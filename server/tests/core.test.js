import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import PDFDocument from "pdfkit";
import { createApp } from "../app.js";
import { createStorage } from "../services/storage.js";
import { createWorker } from "../services/jobs.js";
import { extractPdf, chunkPages } from "../services/pdf.js";
import { validateContent, createAI, publicAIError } from "../services/ai.js";
import { markdown, pdfExport } from "../services/exports.js";
import { Pack, Job, Attempt, CardProgress, Conversation } from "../models.js";
import { samplePack, samplePages } from "../../shared/sample.js";
let mongo, dir, app, alice, bob, storage, worker, pdf;
let failGeneration = false;
const ai = {
  async generate() {
    if (failGeneration)
      throw new Error("The AI request timed out. Please retry.");
    return structuredClone(samplePack.content);
  },
  async answer(pages, q) {
    return q.includes("outside")
      ? { answer: "I could not find that in your material.", pages: [] }
      : { answer: "Ribosomes synthesize proteins.", pages: [2] };
  },
};
const options = {
  secret: "test-only-secret-at-least-thirty-two-characters",
  origin: "http://127.0.0.1:5173",
  production: false,
  apiKey: "test-injected-provider",
  storage: "local",
};
async function upload(agent = alice) {
  return agent
    .post("/api/packs")
    .field("subject", "Biology")
    .field("detail", "concise")
    .attach("file", pdf, "lecture.pdf");
}
before(
  async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "studyspace-test-"));
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Attempt.init();
    await CardProgress.init();
    storage = createStorage({ ...options, dataDir: dir });
    worker = createWorker({ storage, ai });
    app = createApp({ storage, ai, options });
    alice = request.agent(app);
    bob = request.agent(app);
    pdf = await fs.readFile(
      new URL("../../client/public/sample-biology.pdf", import.meta.url),
    );
  },
  { timeout: 180000 },
);
after(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
  if (dir) await fs.rm(dir, { recursive: true, force: true });
});
test("registration, cookie authentication, sign-in, profile preferences and origin guard", async () => {
  let r = await alice
    .post("/api/auth/register")
    .send({
      name: "Alice Student",
      email: "alice@example.com",
      password: "a-strong-test-password",
    });
  assert.equal(r.status, 200);
  assert.match(r.headers["set-cookie"][0], /HttpOnly/);
  assert.ok(!JSON.stringify(r.body).includes("password"));
  r = await bob
    .post("/api/auth/register")
    .send({
      name: "Bob Student",
      email: "bob@example.com",
      password: "another-test-password",
    });
  assert.equal(r.status, 200);
  assert.equal(
    (await alice.get("/api/auth/me")).body.user.name,
    "Alice Student",
  );
  assert.equal(
    (
      await alice
        .patch("/api/auth/me")
        .send({ name: "Alice", notesPreference: "detailed" })
    ).body.user.notesPreference,
    "detailed",
  );
  assert.equal((await request(app).get("/api/packs")).status, 401);
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({ email: "alice@example.com", password: "wrong" })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/auth/login")
        .send({
          email: "alice@example.com",
          password: "a-strong-test-password",
        })
    ).status,
    200,
  );
  assert.equal(
    (await alice.post("/api/auth/logout").set("Origin", "https://evil.example"))
      .status,
    403,
  );
});
test("PDF parsing preserves page boundaries; chunking covers all text", async () => {
  const pages = await extractPdf(pdf);
  assert.equal(pages.length, 3);
  assert.match(pages[1].text, /Ribosomes/);
  const chunks = chunkPages(pages, 200);
  assert.ok(chunks.length > 3);
  for (const p of pages)
    assert.ok(chunks.join("").includes(`[Page ${p.number}]`));
  const dense = [{ number: 1, text: "A".repeat(25000) + "LAST_SENTINEL" }];
  assert.match(chunkPages(dense).join(""), /LAST_SENTINEL/);
  await assert.rejects(extractPdf(Buffer.from("not a pdf")), /valid PDF/);
});
test("scanned, password-protected and oversized page-count PDFs return useful errors", async () => {
  async function make(options, pages = 1) {
    return new Promise((resolve) => {
      const d = new PDFDocument({ ...options, autoFirstPage: false }),
        buffers = [];
      d.on("data", (b) => buffers.push(b));
      d.on("end", () => resolve(Buffer.concat(buffers)));
      for (let i = 0; i < pages; i++) {
        d.addPage();
        if (options.userPassword)
          d.text("A locked lecture with meaningful text content.");
      }
      d.end();
    });
  }
  await assert.rejects(extractPdf(await make({})), /Scanned|empty/);
  await assert.rejects(
    extractPdf(await make({ userPassword: "locked" })),
    /password-protected/,
  );
  await assert.rejects(extractPdf(await make({}, 101)), /100 pages/);
});
test("generated content rejects malformed quizzes and nonexistent citations", () => {
  assert.equal(validateContent(samplePack.content, 3).quiz.length, 5);
  const bad = structuredClone(samplePack.content);
  bad.quiz[0].answer = 4;
  assert.throws(() => validateContent(bad, 3));
  const refs = structuredClone(samplePack.content);
  refs.topics[0].pages = [99];
  assert.throws(() => validateContent(refs, 3), /invalid source/);
  assert.match(publicAIError(new Error("429 quota")), /usage limit/);
  assert.match(publicAIError(new Error("Abort timeout")), /timed out/);
});
test("missing provider configuration fails honestly", async () => {
  await assert.rejects(
    createAI({ apiKey: "" }).generate(samplePages, "concise"),
    /not configured/,
  );
});
test("full upload-to-study flow, source protection, practice persistence and exports", async () => {
  const r = await upload();
  assert.equal(r.status, 202);
  const id = r.body.pack._id;
  assert.equal((await bob.get("/api/packs/" + id)).status, 404);
  assert.equal((await bob.get("/api/packs/" + id + "/source")).status, 404);
  assert.equal(
    (await bob.patch("/api/packs/" + id).send({ title: "Stolen" })).status,
    404,
  );
  assert.equal((await bob.delete("/api/packs/" + id)).status, 404);
  await worker.tick();
  const loaded = await alice.get("/api/packs/" + id);
  assert.equal(loaded.body.pack.status, "ready");
  assert.equal(loaded.body.pack.pageCount, 3);
  assert.equal(loaded.body.job.status, "ready");
  const source = await alice.get("/api/packs/" + id + "/source");
  assert.equal(source.status, 200);
  assert.match(source.headers["content-type"], /pdf/);
  const started = await alice.post("/api/packs/" + id + "/attempts");
  const attempt = started.body.attempt;
  assert.equal(
    (await alice.post("/api/packs/" + id + "/attempts")).body.attempt._id,
    attempt._id,
  );
  let result;
  for (let i = 0; i < 5; i++) {
    result = await alice
      .patch(`/api/packs/${id}/attempts/${attempt._id}`)
      .send({
        index: i,
        answer: i === 0 ? 0 : samplePack.content.quiz[i].answer,
      });
    assert.equal(result.status, 200);
    if (i === 0) {
      const resumed = await alice.get("/api/packs/" + id);
      assert.equal(resumed.body.attempt.answers.length, 1);
      assert.equal(
        (
          await alice
            .patch(`/api/packs/${id}/attempts/${attempt._id}`)
            .send({ index: 0, answer: 1 })
        ).status,
        409,
      );
    }
  }
  assert.equal(result.body.attempt.score, 4);
  assert.equal(result.body.attempt.completed, true);
  assert.deepEqual(result.body.attempt.missedTopics, ["Cell foundations"]);
  await alice.put(`/api/packs/${id}/cards/0`).send({ state: "review" });
  await alice.put(`/api/packs/${id}/cards/0`).send({ state: "known" });
  const resumed = await alice.get("/api/packs/" + id);
  assert.equal(resumed.body.cards[0].reviews, 2);
  assert.equal(resumed.body.cards[0].state, "known");
  const answer = await alice
    .post(`/api/packs/${id}/ask`)
    .send({ question: "What do ribosomes do?" });
  assert.deepEqual(answer.body.message.pages, [2]);
  const unknown = await alice
    .post(`/api/packs/${id}/ask`)
    .send({ question: "Something outside the document" });
  assert.deepEqual(unknown.body.message.pages, []);
  const md = await alice.get(`/api/packs/${id}/export?format=md&kind=quiz`);
  assert.match(md.text, /Answer key/);
  assert.match(md.text, /Source: page/);
  const exported = await alice.get(`/api/packs/${id}/export?format=pdf`);
  assert.equal(exported.status, 200);
  assert.match(exported.headers["content-type"], /pdf/);
  assert.equal(
    (await bob.get(`/api/packs/${id}/export?format=md`)).status,
    404,
  );
  const progress = await alice.get("/api/progress");
  assert.equal(progress.body.attempts.length, 1);
  assert.equal(progress.body.cards.length, 1);
  assert.equal((await bob.get("/api/progress")).body.attempts.length, 0);
  const key = (await Pack.findById(id)).fileKey;
  assert.equal((await alice.delete("/api/packs/" + id)).status, 200);
  await assert.rejects(storage.get(key));
  for (const model of [Job, Attempt, CardProgress, Conversation])
    assert.equal(await model.countDocuments({ pack: id }), 0);
  assert.equal(await Pack.findById(id), null);
});
test("upload validation and failed generation retry are persistent and duplicate-safe", async () => {
  assert.equal(
    (
      await alice
        .post("/api/packs")
        .field("subject", "x")
        .field("detail", "concise")
        .attach("file", Buffer.from("fake"), "fake.pdf")
    ).status,
    400,
  );
  assert.equal(
    (
      await alice
        .post("/api/packs")
        .field("subject", "x")
        .field("detail", "concise")
      .attach("file", Buffer.alloc(3 * 1024 * 1024), "large.pdf")
    ).status,
    400,
  );
  failGeneration = true;
  const r = await upload();
  const id = r.body.pack._id;
  await worker.tick();
  let loaded = await alice.get("/api/packs/" + id);
  assert.equal(loaded.body.pack.status, "failed");
  assert.match(loaded.body.pack.error, /timed out/);
  failGeneration = false;
  assert.equal((await alice.post("/api/packs/" + id + "/retry")).status, 200);
  assert.equal((await alice.post("/api/packs/" + id + "/retry")).status, 409);
  await worker.tick();
  loaded = await alice.get("/api/packs/" + id);
  assert.equal(loaded.body.pack.status, "ready");
});
test("restart recovery requeues interrupted jobs and retains source data", async () => {
  const r = await upload();
  const id = r.body.pack._id;
  await Job.updateOne({ pack: id }, { status: "generating" });
  await Pack.updateOne({ _id: id }, { status: "generating" });
  const stop = await worker.start();
  await new Promise((resolve) => setTimeout(resolve, 300));
  stop();
  for (let i = 0; i < 30; i++) {
    const p = await Pack.findById(id);
    if (p.status === "ready") break;
    await new Promise((r) => setTimeout(r, 100));
  }
  assert.equal((await Pack.findById(id)).status, "ready");
});
test("exports retain formulas, citations, and a separate answer-key page", async () => {
  assert.match(markdown(samplePack), /Source: page 3/);
  const output = await pdfExport(samplePack, "quiz");
  const pages = await extractPdf(output);
  const answerIndex = pages.findIndex((p) => p.text.includes("Answer key"));
  assert.ok(answerIndex > 0);
  assert.ok(!pages[0].text.includes("Answer key"));
  const special = structuredClone(samplePack);
  special.content.formulas = [
    {
      formula: "Δx = v × t",
      explanation: "Unicode formula export check.",
      pages: [1],
    },
  ];
  const result = await extractPdf(await pdfExport(special));
  assert.match(result.map((p) => p.text).join(""), /Δx = v × t/);
});
test("logout clears the session", async () => {
  assert.equal((await alice.post("/api/auth/logout")).status, 200);
  assert.equal((await alice.get("/api/auth/me")).status, 401);
});
