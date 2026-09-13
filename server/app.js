import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { z } from "zod";
import { config, root } from "./config.js";
import {
  User,
  Pack,
  Job,
  Attempt,
  CardProgress,
  Conversation,
} from "./models.js";
import { markdown, pdfExport } from "./services/exports.js";
import { samplePack, samplePages } from "../shared/sample.js";
const err = (status, message) => Object.assign(new Error(message), { status });
const cleanUser = (u) => ({
  id: String(u._id),
  name: u.name,
  email: u.email,
  notesPreference: u.notesPreference,
});
const text = (n = 200) => z.string().trim().min(1).max(n);
export function createApp({ storage, ai, options = config, worker } = {}) {
  const app = express();
  app.disable("x-powered-by");
  if (options.production) app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          frameSrc: ["'self'", "blob:"],
          objectSrc: ["'self'", "blob:"],
          connectSrc: ["'self'"],
          upgradeInsecureRequests: options.production ? [] : null,
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  const origins = options.origin.split(",").map((s) => s.trim());
  app.use(cors({ origin: origins, credentials: true }));
  app.use((req, res, next) => {
    let sameHost = false;
    if (req.headers.origin)
      try {
        sameHost = new URL(req.headers.origin).host === req.get("host");
      } catch {
        sameHost = false;
      }
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      !origins.includes(req.headers.origin) &&
      !sameHost
    )
      return next(err(403, "Request origin is not allowed."));
    next();
  });
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use(
    "/api",
    rateLimit({
      windowMs: 60000,
      limit: 180,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many requests. Please wait a minute." },
    }),
  );
  const authLimit = rateLimit({
    windowMs: 15 * 60000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many sign-in attempts. Please try again later." },
  });
  const aiLimit = rateLimit({
    windowMs: 60000,
    limit: 12,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Please wait a minute before another AI request." },
  });
  app.get("/api/health", (req, res) =>
    res.json({
      ok: true,
      database: mongoose.connection.readyState === 1,
      aiConfigured: !!options.apiKey,
      storage: options.storage,
    }),
  );
  app.get("/api/sample", (req, res) =>
    res.json({ ...samplePack, pages: samplePages }),
  );
  app.get("/api/sample/export", async (req, res) => {
    const kind = req.query.kind === "quiz" ? "quiz" : "notes";
    if (req.query.format === "md")
      res
        .type("text/markdown")
        .attachment(`sample-${kind}.md`)
        .send(markdown(samplePack, kind));
    else
      res
        .type("application/pdf")
        .attachment(`sample-${kind}.pdf`)
        .send(await pdfExport(samplePack, kind));
  });
  app.use("/api", (req, res, next) =>
    mongoose.connection.readyState === 1
      ? next()
      : next(
          err(
            503,
            "Account storage is not connected yet. Configure MONGODB_URI on the server. You can explore the sample meanwhile.",
          ),
        ),
  );
  const cookie = {
    httpOnly: true,
    secure: options.production,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 86400000,
  };
  const sign = (res, user) => {
    res.cookie(
      "session",
      jwt.sign({ sub: String(user._id) }, options.secret, { expiresIn: "7d" }),
      cookie,
    );
    res.json({ user: cleanUser(user) });
  };
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const v = z
      .object({
        name: text(80),
        email: z
          .string()
          .trim()
          .email()
          .max(254)
          .transform((s) => s.toLowerCase()),
        password: z.string().min(10).max(128),
      })
      .parse(req.body);
    try {
      const user = await User.create({
        ...v,
        password: await bcrypt.hash(v.password, 12),
      });
      sign(res, user);
    } catch (e) {
      if (e.code === 11000)
        throw err(
          409,
          "An account with this email already exists. Please sign in.",
        );
      throw e;
    }
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const v = z
      .object({
        email: z
          .string()
          .trim()
          .email()
          .transform((s) => s.toLowerCase()),
        password: z.string().min(1).max(128),
      })
      .parse(req.body);
    const user = await User.findOne({ email: v.email }).select("+password");
    if (!user || !(await bcrypt.compare(v.password, user.password)))
      throw err(401, "Email or password is incorrect.");
    sign(res, user);
  });
  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("session", { ...cookie, maxAge: undefined });
    res.json({ ok: true });
  });
  app.use("/api", async (req, res, next) => {
    try {
      const token = jwt.verify(req.cookies.session || "", options.secret);
      const user = await User.findById(token.sub);
      if (!user) throw new Error();
      req.user = user;
      next();
    } catch {
      next(err(401, "Please sign in to continue."));
    }
  });
  app.get("/api/auth/me", (req, res) =>
    res.json({ user: cleanUser(req.user) }),
  );
  app.patch("/api/auth/me", async (req, res) => {
    const v = z
      .object({
        name: text(80),
        notesPreference: z.enum(["concise", "detailed"]),
      })
      .parse(req.body);
    Object.assign(req.user, v);
    await req.user.save();
    res.json({ user: cleanUser(req.user) });
  });
  app.get("/api/packs", async (req, res) => {
    const packs = await Pack.find({ owner: req.user._id, deleted: false })
      .select("-content")
      .sort({ lastOpenedAt: -1, createdAt: -1 });
    res.json({ packs });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024 - 1, files: 1, fields: 4 },
    fileFilter(req, file, cb) {
      if (
        file.mimetype !== "application/pdf" ||
        !file.originalname.toLowerCase().endsWith(".pdf")
      )
        return cb(err(400, "Please choose a PDF file."));
      cb(null, true);
    },
  });
  app.post("/api/packs", aiLimit, upload.single("file"), async (req, res) => {
    const v = z
      .object({ subject: text(80), detail: z.enum(["concise", "detailed"]) })
      .parse(req.body);
    if (!req.file) throw err(400, "Please choose a PDF file.");
    if (!req.file.buffer.subarray(0, 1024).includes(Buffer.from("%PDF-")))
      throw err(400, "This file is not a valid PDF.");
    if (!options.apiKey)
      throw err(
        503,
        "Gemini is not configured. Add GEMINI_API_KEY on the server. Try the sample study pack meanwhile.",
      );
    const storageDisabled = options.storage === "none";
    const fileKey = storageDisabled ? "" : `${randomUUID()}.pdf`;
    if (!storageDisabled) await storage.put(fileKey, req.file.buffer);
    let pack;
    try {
      pack = await Pack.create({
        owner: req.user._id,
        title: req.file.originalname.replace(/\.pdf$/i, "").slice(0, 120),
        subject: v.subject,
        detail: v.detail,
        fileKey,
        fileName: req.file.originalname.slice(0, 180),
        sourceData: storageDisabled ? req.file.buffer : undefined,
        lastOpenedAt: new Date(),
      });
      await Job.create({
        owner: req.user._id,
        pack: pack._id,
        stage: "Waiting to read your PDF",
      });
    } catch (e) {
      if (fileKey) await storage.delete(fileKey);
      if (pack) await Pack.deleteOne({ _id: pack._id });
      throw e;
    }
    res.status(202).json({ pack });
    if (!options.serverless) worker?.tick().catch(() => {});
  });
  app.param("packId", async (req, res, next, id) => {
    try {
      if (!mongoose.isValidObjectId(id))
        throw err(404, "Study pack not found.");
      const pack = await Pack.findOne({
        _id: id,
        owner: req.user._id,
        deleted: false,
      });
      if (!pack) throw err(404, "Study pack not found.");
      req.pack = pack;
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/packs/:packId", async (req, res) => {
    await Pack.updateOne({ _id: req.pack._id }, { lastOpenedAt: new Date() });
    const [job, attempt, cards, messages] = await Promise.all([
      Job.findOne({ pack: req.pack._id }),
      Attempt.findOne({
        pack: req.pack._id,
        owner: req.user._id,
        completed: false,
      }),
      CardProgress.find({ pack: req.pack._id, owner: req.user._id }),
      Conversation.find({ pack: req.pack._id, owner: req.user._id }).sort({
        createdAt: 1,
      }),
    ]);
    res.json({ pack: req.pack, job, attempt, cards, messages });
  });
  app.patch("/api/packs/:packId", async (req, res) => {
    const v = z.object({ title: text(120) }).parse(req.body);
    req.pack.title = v.title;
    await req.pack.save();
    res.json({ pack: req.pack });
  });
  app.delete("/api/packs/:packId", async (req, res) => {
    // Tombstone first so an in-flight worker cannot recreate private data.
    await Pack.updateOne({ _id: req.pack._id }, { deleted: true });
    try {
      await storage.delete(req.pack.fileKey);
    } catch (e) {
      await Pack.updateOne({ _id: req.pack._id }, { deleted: false });
      throw err(
        503,
        "The source file could not be removed. Please retry deletion.",
      );
    }
    await Promise.all([
      Job.deleteMany({ pack: req.pack._id }),
      Attempt.deleteMany({ pack: req.pack._id }),
      CardProgress.deleteMany({ pack: req.pack._id }),
      Conversation.deleteMany({ pack: req.pack._id }),
    ]);
    await Pack.deleteOne({ _id: req.pack._id });
    res.json({ ok: true });
  });
  app.post("/api/packs/:packId/retry", aiLimit, async (req, res) => {
    if (!options.apiKey)
      throw err(
        503,
        "Gemini is not configured. Add GEMINI_API_KEY on the server.",
      );
    const job = await Job.findOneAndUpdate(
      { pack: req.pack._id, status: "failed" },
      {
        status: "queued",
        stage: "Waiting to retry",
        error: "",
        completedChunks: 0,
        totalChunks: 0,
      },
      { new: true },
    );
    if (!job) throw err(409, "This study pack is already processing or ready.");
    await Pack.updateOne(
      { _id: req.pack._id },
      { status: "queued", error: "" },
    );
    res.json({ job });
    if (!options.serverless) worker?.tick().catch(() => {});
  });
  app.post("/api/packs/:packId/process", aiLimit, async (req, res) => {
    if (!worker) throw err(503, "Study-pack processing is unavailable.");
    if (req.pack.status === "ready") return res.json({ pack: req.pack });
    if (req.pack.status === "failed")
      throw err(409, "Retry this study pack before processing it again.");
    await worker.tick(req.pack._id);
    const [pack, job] = await Promise.all([
      Pack.findById(req.pack._id),
      Job.findOne({ pack: req.pack._id }),
    ]);
    res.json({ pack, job });
  });
  app.get("/api/packs/:packId/source", async (req, res) => {
    if (!req.pack.fileKey)
      throw err(
        410,
        "The original PDF is not retained when file storage is disabled.",
      );
    res.set("Cache-Control", "private, no-store");
    res.set("Content-Disposition", 'inline; filename="lecture.pdf"');
    res.type("application/pdf").send(await storage.get(req.pack.fileKey));
  });
  const ready = (req, res, next) =>
    req.pack.status === "ready"
      ? next()
      : next(err(409, "Your study pack is not ready yet."));
  app.get("/api/packs/:packId/export", ready, async (req, res) => {
    const kind = req.query.kind === "quiz" ? "quiz" : "notes";
    const format = req.query.format === "md" ? "md" : "pdf";
    const name = req.pack.title.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 70);
    res.attachment(`${name}-${kind}.${format}`);
    if (format === "md")
      res.type("text/markdown").send(markdown(req.pack, kind));
    else res.type("application/pdf").send(await pdfExport(req.pack, kind));
  });
  app.post("/api/packs/:packId/attempts", ready, async (req, res) => {
    let attempt = await Attempt.findOne({
      pack: req.pack._id,
      owner: req.user._id,
      completed: false,
    });
    if (!attempt)
      try {
        attempt = await Attempt.create({
          pack: req.pack._id,
          owner: req.user._id,
        });
      } catch (e) {
        if (e.code !== 11000) throw e;
        attempt = await Attempt.findOne({
          pack: req.pack._id,
          owner: req.user._id,
          completed: false,
        });
      }
    res.json({ attempt });
  });
  app.patch(
    "/api/packs/:packId/attempts/:attemptId",
    ready,
    async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.attemptId))
        throw err(404, "Quiz attempt not found.");
      const v = z
        .object({
          index: z.number().int().min(0).max(4),
          answer: z.number().int().min(0).max(3),
        })
        .parse(req.body);
      const attempt = await Attempt.findOne({
        _id: req.params.attemptId,
        pack: req.pack._id,
        owner: req.user._id,
        completed: false,
      });
      if (!attempt) throw err(404, "Active quiz attempt not found.");
      if (v.index !== attempt.answers.length)
        throw err(409, "This answer was already saved. Reload to continue.");
      const answers = [...attempt.answers, v.answer];
      const completed = answers.length === 5;
      const missedTopics = [
        ...new Set(
          req.pack.content.quiz
            .filter((q, i) => i < answers.length && answers[i] !== q.answer)
            .map((q) => q.topic),
        ),
      ];
      const updated = await Attempt.findOneAndUpdate(
        { _id: attempt._id, completed: false, answers: attempt.answers },
        {
          answers,
          completed,
          score: answers.filter((a, i) => a === req.pack.content.quiz[i].answer)
            .length,
          missedTopics,
        },
        { new: true },
      );
      if (!updated)
        throw err(409, "The quiz changed in another tab. Reload to continue.");
      res.json({ attempt: updated });
    },
  );
  app.put("/api/packs/:packId/cards/:card", ready, async (req, res) => {
    const card = z.coerce.number().int().min(0).max(9).parse(req.params.card);
    const { state } = z
      .object({ state: z.enum(["review", "known"]) })
      .parse(req.body);
    const progress = await CardProgress.findOneAndUpdate(
      { owner: req.user._id, pack: req.pack._id, card },
      { $set: { state }, $inc: { reviews: 1 } },
      { upsert: true, new: true },
    );
    res.json({ progress });
  });
  app.post("/api/packs/:packId/ask", aiLimit, ready, async (req, res) => {
    const v = z
      .object({
        question: text(1500),
        kind: z.enum(["question", "simple"]).default("question"),
      })
      .parse(req.body);
    const pack = await Pack.findById(req.pack._id).select("+pages");
    const result = await ai.answer(pack.pages, v.question, v.kind);
    if (!(await Pack.exists({ _id: pack._id, deleted: false })))
      throw err(404, "Study pack was deleted.");
    const message = await Conversation.create({
      owner: req.user._id,
      pack: pack._id,
      ...v,
      ...result,
    });
    res.json({ message });
  });
  app.get("/api/progress", async (req, res) => {
    const [attempts, cards, packs] = await Promise.all([
      Attempt.find({ owner: req.user._id, completed: true })
        .sort({ createdAt: -1 })
        .populate("pack", "title"),
      CardProgress.find({ owner: req.user._id }),
      Pack.countDocuments({
        owner: req.user._id,
        status: "ready",
        deleted: false,
      }),
    ]);
    res.json({ attempts, cards, packs });
  });
  app.use("/api", (req, res, next) => next(err(404, "API route not found.")));
  app.use(express.static(path.join(root, "client/dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "client/dist/index.html")),
  );
  app.use((e, req, res, next) => {
    if (res.headersSent) return next(e);
    if (e instanceof z.ZodError)
      return res
        .status(400)
        .json({
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        });
    if (e.code === "LIMIT_FILE_SIZE")
      return res
        .status(400)
        .json({ error: "PDF files must be less than 3 MB." });
    if (e instanceof multer.MulterError)
      return res.status(400).json({ error: "Upload one PDF at a time." });
    if (!e.status)
      console.error("Request failed:", {
        method: req.method,
        path: req.path,
        name: e.name,
        message: e.message,
      });
    res
      .status(e.status || 500)
      .json({
        error: e.status ? e.message : "Something went wrong. Please try again.",
      });
  });
  return app;
}
