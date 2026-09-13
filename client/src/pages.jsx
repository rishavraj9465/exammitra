import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation, Navigate } from "react-router-dom";
import {
  Plus,
  UploadCloud,
  ArrowUpRight,
  FileText,
  Search,
  BookOpen,
  Target,
  Layers,
  ArrowRight,
  Check,
  Trash2,
  Pencil,
  Clock,
  CloudUpload,
  TrendingUp,
} from "lucide-react";
import { api, uploadPdf } from "./api";
import { useApp } from "./context";
import { Brand, Footer, PageHeading, ErrorBox, Loading, Modal } from "./ui";
export function Auth({ register = false }) {
  const { user, setUser, health } = useApp();
  const navigate = useNavigate(),
    location = useLocation();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/app" replace />;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const result = await api("/auth/" + (register ? "register" : "login"), {
        method: "POST",
        body: values,
      });
      setUser(result.user);
      navigate(location.state?.from || "/app");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <div className="auth-story">
        <Brand />
        <div>
          <div className="eyebrow">MAKE ROOM FOR UNDERSTANDING</div>
          <h1>
            Your next
            <br />
            “I get it”
            <br />
            starts here.
          </h1>
          <p>
            Bring your lectures. We’ll help you find
            <br />
            the ideas that stay with you.
          </p>
          <div className="auth-note">
            <BookOpen />
            <span>One lecture. A clearer perspective.</span>
          </div>
        </div>
        <span>Made for curious minds.</span>
      </div>
      <main className="auth-form">
        <Link to="/" className="back-link">
          ← Back home
        </Link>
        <div>
          <span className="tag">YOUR PERSONAL STUDY SPACE</span>
          <h1>
            {register ? "A fresh start for your studies." : "Welcome back."}
          </h1>
          <p>
            {register
              ? "Create an account and make your material work for you."
              : "Pick up where your curiosity left off."}
          </p>
          <ErrorBox error={error} />
          {health && !health.database && (
            <div className="notice">
              Account storage is not connected yet.{" "}
              <Link to="/sample">Explore the sample →</Link>
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <label>
                Your name
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                  placeholder="What should we call you?"
                />
              </label>
            )}
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@university.edu"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                minLength={register ? 10 : 1}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "At least 10 characters" : "Enter your password"
                }
              />
            </label>
            <button className="button primary full-width" disabled={busy}>
              {busy
                ? "Please wait…"
                : register
                  ? "Create my workspace"
                  : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to ExamMitra AI?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="small-text">
            Read how we handle your material in our{" "}
            <Link to="/privacy">privacy information</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
function usePacks() {
  const [packs, setPacks] = useState([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const reload = () =>
    api("/packs")
      .then((r) => setPacks(r.packs))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    reload();
  }, []);
  return { packs, error, loading, reload };
}
export function PackCard({ pack, onEdit, onDelete }) {
  return (
    <article className="pack-card">
      <div className="card-top">
        <div className="file-icon">
          <FileText size={23} />
        </div>
        <span className={"tag status-" + pack.status}>
          {pack.status === "ready"
            ? "Ready to study"
            : pack.status === "failed"
              ? "Needs attention"
              : "Processing"}
        </span>
      </div>
      <Link to={"/app/packs/" + pack._id} className="pack-title">
        <h3>{pack.title}</h3>
      </Link>
      <p>
        {pack.subject} <span>·</span>{" "}
        {pack.pageCount ? `${pack.pageCount} pages` : "PDF study pack"}
      </p>
      <div className="card-bottom">
        <span>
          {new Date(pack.createdAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
        <div>
          {onEdit && (
            <button
              className="icon-button"
              aria-label={`Rename ${pack.title}`}
              onClick={() => onEdit(pack)}
            >
              <Pencil size={16} />
            </button>
          )}
          {onDelete && (
            <button
              className="icon-button"
              aria-label={`Delete ${pack.title}`}
              onClick={() => onDelete(pack)}
            >
              <Trash2 size={16} />
            </button>
          )}
          <Link aria-label={`Open ${pack.title}`} to={"/app/packs/" + pack._id}>
            <ArrowUpRight size={21} />
          </Link>
        </div>
      </div>
    </article>
  );
}
export function Dashboard() {
  const { user, health } = useApp(),
    { packs, error, loading } = usePacks();
  const [progress, setProgress] = useState(null);
  useEffect(() => {
    api("/progress")
      .then(setProgress)
      .catch(() => {});
  }, []);
  return (
    <>
      <PageHeading
        eyebrow="A LITTLE PROGRESS GOES A LONG WAY"
        title={`Hello, ${user.name.split(" ")[0]}.`}
        description="What would you like to understand today?"
      />
      <ErrorBox error={error} />
      {health && !health.aiConfigured && (
        <div className="notice">
          <span>
            Live generation needs a Gemini API key on the server. Your sample is
            ready to explore.
          </span>
          <Link to="/sample">Open sample →</Link>
        </div>
      )}
      <section className="upload-banner">
        <div>
          <span className="tag">YOUR NEXT LIGHTBULB MOMENT</span>
          <h2>
            Big lecture.
            <br />
            Clear little takeaways.
          </h2>
          <p>
            Turn your PDF into notes, questions and flashcards
            <br />
            that help the important ideas stick.
          </p>
          <Link className="button primary" to="/app/upload">
            <Plus size={18} /> Create a study pack
          </Link>
        </div>
        <Link to="/app/upload" className="upload-banner-box">
          <CloudUpload size={38} />
          <strong>Bring your lecture here</strong>
          <span>PDF · Less than 3 MB · 100 pages</span>
          <span className="upload-mini-button">
            Choose a PDF <ArrowUpRight size={16} />
          </span>
        </Link>
      </section>
      <div className="stat-grid">
        <Stat
          icon={BookOpen}
          label="Study packs"
          value={packs.filter((p) => p.status === "ready").length}
        />
        <Stat
          icon={Target}
          label="Quizzes completed"
          value={progress?.attempts.length || 0}
        />
        <Stat
          icon={Layers}
          label="Cards reviewed"
          value={progress?.cards.length || 0}
        />
      </div>
      <div className="section-heading">
        <h2>Pick up where you left off</h2>
        <Link to="/app/library">
          View library <ArrowRight size={16} />
        </Link>
      </div>
      {loading ? (
        <Loading />
      ) : packs.length ? (
        <div className="pack-grid">
          {packs.slice(0, 3).map((p) => (
            <PackCard key={p._id} pack={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen />
          <h3>Your next chapter starts here.</h3>
          <p>
            Upload your first lecture or explore a sample to see how it works.
          </p>
          <Link className="button secondary" to="/sample">
            Explore the biology sample <ArrowUpRight size={17} />
          </Link>
        </div>
      )}
    </>
  );
}
export function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <span className="stat-icon">
        <Icon size={21} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
export function Library() {
  const { packs, error, loading, reload } = usePacks();
  const [search, setSearch] = useState(""),
    [subject, setSubject] = useState(""),
    [editing, setEditing] = useState(null),
    [deleting, setDeleting] = useState(null),
    [actionError, setActionError] = useState(""),
    [busy, setBusy] = useState(false);
  const filtered = packs.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) &&
      (!subject || p.subject === subject),
  );
  async function action(fn) {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      setEditing(null);
      setDeleting(null);
      await reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="ALL YOUR IDEAS, TOGETHER"
        title="Your study library"
        description="A home for the material you’re making sense of."
      >
        <Link className="button primary" to="/app/upload">
          <Plus size={17} /> New study pack
        </Link>
      </PageHeading>
      <div className="library-tools">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Search study packs"
            placeholder="Search your study packs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter by subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">All subjects</option>
          {[...new Set(packs.map((p) => p.subject))].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>
      <ErrorBox error={error} />
      {loading ? (
        <Loading />
      ) : filtered.length ? (
        <div className="pack-grid">
          {filtered.map((p) => (
            <PackCard
              key={p._id}
              pack={p}
              onEdit={(p) => {
                setEditing(p);
                setActionError("");
              }}
              onDelete={(p) => {
                setDeleting(p);
                setActionError("");
              }}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <LibraryIcon />
          <h3>
            {packs.length
              ? "No matching study packs."
              : "A little empty, full of possibility."}
          </h3>
          <p>
            {packs.length
              ? "Try another search or subject."
              : "Create your first study pack to begin."}
          </p>
          <Link className="button primary" to="/app/upload">
            Upload a lecture
          </Link>
        </div>
      )}
      {editing && (
        <Modal title="Rename study pack" onClose={() => setEditing(null)}>
          <ErrorBox error={actionError} />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const title = new FormData(e.currentTarget).get("title");
              action(() =>
                api("/packs/" + editing._id, {
                  method: "PATCH",
                  body: { title },
                }),
              );
            }}
          >
            <label>
              Study pack title
              <input
                name="title"
                autoFocus
                required
                maxLength={120}
                defaultValue={editing.title}
              />
            </label>
            <button disabled={busy} className="button primary">
              {busy ? "Saving…" : "Save title"}
            </button>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete this study pack?"
          onClose={() => setDeleting(null)}
        >
          <p>
            “{deleting.title}”, its PDF, generated material and all practice
            progress will be permanently removed.
          </p>
          <ErrorBox error={actionError} />
          <div className="actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep it
            </button>
            <button
              disabled={busy}
              className="button danger"
              onClick={() =>
                action(() =>
                  api("/packs/" + deleting._id, { method: "DELETE" }),
                )
              }
            >
              {busy ? "Deleting…" : "Delete study pack"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function LibraryIcon() {
  return <BookOpen />;
}
export function Upload() {
  const { user, health } = useApp(),
    navigate = useNavigate();
  const [file, setFile] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [progress, setProgress] = useState(0),
    [drag, setDrag] = useState(false);
  function choose(f) {
    setError("");
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".pdf"))
      return setError("Please select a PDF file.");
    if (f.size >= 3 * 1024 * 1024)
      return setError("Your PDF must be less than 3 MB.");
    setFile(f);
  }
  async function submit(e) {
    e.preventDefault();
    if (!file) return setError("Choose a PDF first.");
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    form.set("file", file);
    try {
      const { pack } = await uploadPdf(form, setProgress);
      navigate("/app/packs/" + pack._id);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="FROM LECTURE TO LIGHTBULB"
        title="Let’s make it make sense."
        description="Bring one lecture. Leave with a whole new way to study it."
      />
      <div className="upload-layout">
        <form className="panel upload-form" onSubmit={submit}>
          <ErrorBox error={error} />
          {health && !health.aiConfigured && (
            <div className="notice">
              Live generation is not configured. Add GEMINI_API_KEY on the
              server, or <Link to="/sample">try the sample</Link>.
            </div>
          )}
          <label
            className={"dropzone " + (drag ? "dragging" : "")}
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              if (!busy) choose(e.dataTransfer.files[0]);
            }}
          >
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={busy}
              onChange={(e) => choose(e.target.files[0])}
            />
            <span className="drop-icon">
              {file ? <FileText size={29} /> : <UploadCloud size={29} />}
            </span>
            <strong>{file ? file.name : "Drop your lecture PDF here"}</strong>
            <span>
              {file
                ? `${(file.size / 1024 / 1024).toFixed(2)} MB · Click to change`
                : "or click to choose a file"}
            </span>
            <small>Text-based PDF · Less than 3 MB · 100 pages</small>
          </label>
          <div className="form-row">
            <label>
              Subject
              <input
                name="subject"
                required
                maxLength={80}
                placeholder="e.g. Biology"
                disabled={busy}
              />
            </label>
            <label>
              Revision notes
              <select
                name="detail"
                defaultValue={user.notesPreference}
                disabled={busy}
              >
                <option value="concise">Concise · the essentials</option>
                <option value="detailed">Detailed · a closer look</option>
              </select>
            </label>
          </div>
          <div className="notice subtle">
            Your PDF text is processed with Gemini to create your study
            material. <Link to="/privacy">How your data is used</Link>
          </div>
          {busy && (
            <div role="status">
              <p>Uploading your lecture… {progress}%</p>
              <progress value={progress} max="100" />
            </div>
          )}
          <button
            className="button primary full-width"
            disabled={busy || !file || (health && !health.aiConfigured)}
          >
            {busy ? "Uploading…" : "Create my study pack"}
            <ArrowRight size={18} />
          </button>
        </form>
        <aside className="upload-aside">
          <span className="eyebrow">ONE PDF, MORE WAYS TO LEARN</span>
          <h2>
            A little structure.
            <br />A lot more clarity.
          </h2>
          {[
            [
              "Clear revision notes",
              "The important ideas, with links to their source.",
            ],
            [
              "5 practice questions",
              "Check your understanding and learn from mistakes.",
            ],
            ["10 flashcards", "Recall the essentials, one idea at a time."],
            [
              "Answers from your material",
              "Ask a question. Go back to the page.",
            ],
          ].map(([t, d]) => (
            <div key={t}>
              <Check size={18} />
              <span>
                <strong>{t}</strong>
                <p>{d}</p>
              </span>
            </div>
          ))}
          <p className="small-text">
            Scanned and password-protected PDFs aren’t supported yet.
          </p>
        </aside>
      </div>
    </>
  );
}
function ScoreTrend({ attempts }) {
  const history = [...attempts].reverse();
  const width = 720;
  const height = 220;
  const left = 42;
  const right = 18;
  const top = 22;
  const bottom = 42;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const points = history.map((attempt, index) => ({
    ...attempt,
    x:
      history.length === 1
        ? left + chartWidth / 2
        : left + (index / (history.length - 1)) * chartWidth,
    y: top + chartHeight - (attempt.score / 5) * chartHeight,
  }));
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <section className="panel progress-chart-card">
      <div className="chart-heading">
        <div>
          <span className="eyebrow">QUIZ PERFORMANCE</span>
          <h2>Your score trend</h2>
          <p>See how your understanding changes with every completed quiz.</p>
        </div>
        <span className="chart-badge">
          <TrendingUp size={16} /> {history.length} {history.length === 1 ? "quiz" : "quizzes"}
        </span>
      </div>
      {history.length ? (
        <div className="score-chart-scroll">
          <svg
            className="score-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Quiz score trend across ${history.length} completed ${history.length === 1 ? "quiz" : "quizzes"}`}
          >
            {[0, 1, 2, 3, 4, 5].map((score) => {
              const y = top + chartHeight - (score / 5) * chartHeight;
              return (
                <g key={score}>
                  <line className="chart-grid-line" x1={left} x2={width - right} y1={y} y2={y} />
                  <text className="chart-axis-label" x={left - 15} y={y + 4}>{score}</text>
                </g>
              );
            })}
            {points.length > 1 && <polyline className="chart-area-line" points={path} />}
            {points.map((point, index) => (
              <g className="chart-point" key={point._id || index}>
                <circle cx={point.x} cy={point.y} r="6" />
                <text className="chart-score-label" x={point.x} y={point.y - 13}>{point.score}/5</text>
                <text className="chart-date-label" x={point.x} y={height - 13}>
                  {new Date(point.updatedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                </text>
                <title>{`${point.pack?.title || "Study pack"}: ${point.score} out of 5`}</title>
              </g>
            ))}
          </svg>
        </div>
      ) : (
        <div className="chart-empty">
          <TrendingUp size={28} />
          <div>
            <strong>Your graph will grow with you.</strong>
            <p>Complete a quiz and your first score will appear here.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function Progress() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api("/progress")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const attempts = data.attempts;
  const average = attempts.length
    ? Math.round(
        (attempts.reduce((s, a) => s + a.score, 0) / attempts.length / 5) * 100,
      )
    : 0;
  const missed = {};
  attempts.forEach((a) =>
    a.missedTopics.forEach((t) => (missed[t] = (missed[t] || 0) + 1)),
  );
  return (
    <>
      <PageHeading
        eyebrow="NOTICE HOW FAR YOU’VE COME"
        title="Small steps. Real progress."
        description="A reflection of your practice, with a little direction for what’s next."
      />
      <div className="stat-grid">
        <Stat icon={Target} value={attempts.length} label="Quizzes completed" />
        <Stat
          icon={Check}
          value={attempts.length ? average + "%" : "—"}
          label="Average quiz score"
        />
        <Stat
          icon={Layers}
          value={data.cards.length}
          label="Unique cards reviewed"
        />
      </div>
      <ScoreTrend attempts={attempts} />
      <div className="progress-layout">
        <section className="panel">
          <h2>Your quiz history</h2>
          {attempts.length ? (
            attempts.map((a) => (
              <div className="history-row" key={a._id}>
                <div className="file-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <Link to={"/app/packs/" + a.pack?._id}>
                    <strong>{a.pack?.title || "Study pack"}</strong>
                  </Link>
                  <small>
                    {new Date(a.updatedAt).toLocaleDateString()} ·{" "}
                    {a.missedTopics.length
                      ? "Review: " + a.missedTopics.join(", ")
                      : "All questions answered correctly"}
                  </small>
                </div>
                <span className="score-pill">{a.score}/5</span>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <Target />
              <h3>Your first quiz is a starting point.</h3>
              <p>Complete a quiz in a study pack to see your progress here.</p>
              <Link to="/app/library" className="button secondary">
                Find a study pack
              </Link>
            </div>
          )}
        </section>
        <aside className="panel review-panel">
          <div className="eyebrow">WORTH ANOTHER LOOK</div>
          <h2>
            Make the tricky
            <br />
            parts click.
          </h2>
          <p>Topics you’ve missed in completed quizzes.</p>
          {Object.entries(missed)
            .sort((a, b) => b[1] - a[1])
            .map(([t, n]) => (
              <div className="review-topic" key={t}>
                <BookOpen size={17} />
                <strong>{t}</strong>
                <span>
                  {n} {n === 1 ? "quiz" : "quizzes"}
                </span>
              </div>
            ))}
          {!Object.keys(missed).length && (
            <p>
              {attempts.length
                ? "No missed topics so far. Keep practising."
                : "Your review suggestions will appear after a quiz."}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}
export function Settings() {
  const { user, setUser, theme, setTheme } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setSuccess(false);
    setError("");
    try {
      const { user } = await api("/auth/me", {
        method: "PATCH",
        body: Object.fromEntries(new FormData(e.currentTarget)),
      });
      setUser(user);
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="MAKE YOURSELF AT HOME"
        title="Your preferences"
        description="A workspace that feels a little more like you."
      />
      <div className="settings-grid">
        <section className="panel">
          <h2>Profile & study style</h2>
          <ErrorBox error={error} />
          {success && (
            <div className="notice success" role="status">
              <Check size={18} /> Your preferences have been saved.
            </div>
          )}
          <form onSubmit={submit}>
            <label>
              Your name
              <input
                name="name"
                required
                maxLength={80}
                defaultValue={user.name}
              />
            </label>
            {!user.guest && (
              <label>
                Email
                <input value={user.email} disabled />
              </label>
            )}
            <label>
              Default revision notes
              <select
                name="notesPreference"
                defaultValue={user.notesPreference}
              >
                <option value="concise">Concise · the essentials</option>
                <option value="detailed">Detailed · a closer look</option>
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save preferences"}
            </button>
          </form>
        </section>
        <section className="panel">
          <h2>Appearance</h2>
          <p>
            Choose what feels comfortable. This setting is saved on this device.
          </p>
          <label>
            Colour theme
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="system">Follow my device</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <hr />
          <h3>Your data</h3>
          <p>
            Delete individual study packs from your library to remove their
            files and associated study history.
          </p>
          <Link to="/privacy" className="text-link">
            Read about privacy <ArrowUpRight size={16} />
          </Link>
        </section>
      </div>
    </>
  );
}
