import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  FileText,
  Layers,
  MessageCircle,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  ExternalLink,
  X,
  Check,
  RotateCcw,
  Sparkles,
  Send,
  Target,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { samplePack, samplePages } from "../../shared/sample";
import { api } from "./api";
import { Brand, Footer, ErrorBox, Loading, ThemeToggle, Modal } from "./ui";
function readSample() {
  try {
    return JSON.parse(localStorage.getItem("studyspace-sample-progress")) || {};
  } catch {
    return {};
  }
}
const tabs = [
  ["notes", FileText, "Notes"],
  ["quiz", Target, "Quiz"],
  ["flashcards", Layers, "Flashcards"],
  ["ask", MessageCircle, "Ask AI"],
];
export default function Workspace({ sample = false }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = tabs.some(([t]) => t === params.get("tab"))
    ? params.get("tab")
    : "notes";
  const [data, setData] = useState(
      sample
        ? {
            pack: samplePack,
            cards: readSample().cards || [],
            attempt: readSample().attempt || null,
            messages: [],
          }
        : null,
    ),
    [error, setError] = useState(""),
    [source, setSource] = useState(null),
    [exporting, setExporting] = useState(false),
    [busy, setBusy] = useState(false);
  const pack = data?.pack;
  useEffect(() => {
    if (sample) return;
    let cancelled = false,
      timer;
    async function load() {
      try {
        const result = await api("/packs/" + id);
        if (cancelled) return;
        setData(result);
        setError("");
        if (["queued", "reading", "generating"].includes(result.pack.status))
          timer = setTimeout(load, 2500);
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, sample]);
  function update(field, value) {
    setData((d) => {
      const next = { ...d, [field]: value };
      if (sample && ["attempt", "cards"].includes(field))
        localStorage.setItem(
          "studyspace-sample-progress",
          JSON.stringify({ attempt: next.attempt, cards: next.cards }),
        );
      return next;
    });
  }
  function changeTab(next) {
    setParams({ tab: next });
  }
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool || !pack) return;
    const lifecycle = new AbortController();
    Promise.resolve(
      context.registerTool(
        {
          name: "open_study_tab",
          title: "Open study tab",
          description:
            "Open Notes, Quiz, Flashcards or Ask AI in the current study pack. Does not answer questions or submit practice.",
          inputSchema: {
            type: "object",
            properties: {
              tab: { type: "string", enum: tabs.map((t) => t[0]) },
            },
            required: ["tab"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: async (input) => {
            if (
              !input ||
              !tabs.some(([t]) => t === input.tab) ||
              Object.keys(input).some((k) => k !== "tab")
            )
              throw new Error("Choose notes, quiz, flashcards or ask.");
            setParams({ tab: input.tab });
            await new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            );
            return { packId: pack._id, tab: input.tab };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
    return () => lifecycle.abort();
  }, [pack?._id]);
  async function retry() {
    setError("");
    setBusy(true);
    try {
      await api("/packs/" + id + "/retry", { method: "POST" });
      window.location.reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const inner = !data ? (
    error ? (
      <ErrorBox error={error} />
    ) : (
      <Loading />
    )
  ) : (
    <>
      <div className="study-heading">
        <div>
          <Link to={sample ? "/" : "/app/library"} className="back-link">
            <ArrowLeft size={15} />
            {sample ? "Back home" : "Your library"}
          </Link>
          <div className="study-title">
            <div className="file-icon">
              <FileText />
            </div>
            <div>
              <h1>{pack.title}</h1>
              <p>
                {pack.subject} <span>·</span> {pack.pageCount || "…"} pages{" "}
                <span>·</span>{" "}
                {sample ? "Curated sample" : pack.detail + " notes"}
              </p>
            </div>
          </div>
        </div>
        <div className="study-actions">
          <button
            className="button secondary"
            onClick={() => setSource(1)}
            disabled={!sample && !pack.pageCount}
          >
            <BookOpen size={16} /> Source PDF
          </button>
          <button
            className="button secondary"
            disabled={pack.status !== "ready"}
            onClick={() => setExporting(true)}
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>
      {sample && (
        <div className="sample-notice">
          <Sparkles size={17} />
          <span>
            You’re exploring a curated sample. Practice stays on this device;
            answers are not live AI.
          </span>
          <Link to="/register">
            Make it yours <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
      <ErrorBox error={error} />
      {pack.status !== "ready" ? (
        <div className="processing panel">
          <div className="processing-icon">
            {pack.status === "failed" ? (
              <RotateCcw />
            ) : (
              <Loader2 className="spin" />
            )}
          </div>
          <h2>
            {pack.status === "failed"
              ? "Let’s try that again."
              : "Making room for understanding."}
          </h2>
          <p role="status">
            {pack.status === "failed"
              ? pack.error
              : data.job?.stage || "Waiting to read your PDF"}
          </p>
          {pack.status !== "failed" && (
            <ol className="processing-steps">
              {["queued", "reading", "generating", "ready"].map((s, i) => (
                <li
                  key={s}
                  className={
                    ["queued", "reading", "generating", "ready"].indexOf(
                      pack.status,
                    ) >= i
                      ? "active"
                      : ""
                  }
                >
                  <span>{i + 1}</span>
                  {["Uploaded", "Reading PDF", "Creating material", "Ready"][i]}
                </li>
              ))}
            </ol>
          )}
          {pack.status === "failed" ? (
            <button className="button primary" disabled={busy} onClick={retry}>
              Retry processing
            </button>
          ) : (
            <p className="small-text">
              You can leave this page. Your study pack will keep processing.
            </p>
          )}
        </div>
      ) : (
        <>
          <nav className="study-tabs" aria-label="Study activities">
            {tabs.map(([key, Icon, label]) => (
              <button
                key={key}
                aria-current={key === tab ? "page" : undefined}
                className={tab === key ? "active" : ""}
                onClick={() => changeTab(key)}
              >
                <Icon size={18} />
                {label}
                {key === "quiz" && <span>5</span>}
                {key === "flashcards" && <span>10</span>}
              </button>
            ))}
          </nav>
          <div className={"study-columns " + (source ? "has-source" : "")}>
            <section className="study-content">
              {tab === "notes" && (
                <Notes
                  pack={pack}
                  onSource={setSource}
                  onExplain={async (question) => {
                    changeTab("ask");
                    setBusy(true);
                    try {
                      let message;
                      if (sample)
                        message = {
                          question,
                          answer:
                            "Example: think of a cell as a small team. Each organelle has a job: ribosomes make proteins, the nucleus stores instructions in DNA, and mitochondria supply usable energy as ATP.",
                          pages: [2],
                          kind: "simple",
                        };
                      else
                        ({ message } = await api("/packs/" + id + "/ask", {
                          method: "POST",
                          body: { question, kind: "simple" },
                        }));
                      update("messages", [...data.messages, message]);
                    } catch (e) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              )}
              {tab === "quiz" && (
                <Quiz
                  pack={pack}
                  attempt={data.attempt}
                  onAttempt={(a) => update("attempt", a)}
                  onSource={setSource}
                  sample={sample}
                />
              )}
              {tab === "flashcards" && (
                <Flashcards
                  pack={pack}
                  cards={data.cards}
                  onCards={(cards) => update("cards", cards)}
                  onSource={setSource}
                  sample={sample}
                />
              )}
              {tab === "ask" && (
                <Chat
                  pack={pack}
                  messages={data.messages}
                  onMessages={(m) => update("messages", m)}
                  onSource={setSource}
                  sample={sample}
                  busyExternal={busy}
                />
              )}
            </section>
            {source && (
              <Source
                page={source}
                setPage={setSource}
                pack={pack}
                sample={sample}
              />
            )}
          </div>
        </>
      )}
      {source && pack.status !== "ready" && (
        <Modal title="Source PDF" onClose={() => setSource(null)}>
          <iframe
            title="Source PDF"
            className="source-frame"
            src={"/api/packs/" + id + "/source#page=" + source}
          />
        </Modal>
      )}
      {exporting && (
        <Export
          pack={pack}
          sample={sample}
          onClose={() => setExporting(false)}
        />
      )}
    </>
  );
  return sample ? (
    <>
      <header className="public-nav">
        <Brand />
        <nav>
          <ThemeToggle />
          <Link className="button primary" to="/register">
            Create your workspace <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>
      <main className="sample-workspace">{inner}</main>
      <Footer />
    </>
  ) : (
    inner
  );
}
function Citations({ pages, onSource }) {
  return (
    <div className="citations">
      {pages.map((p) => (
        <button key={p} onClick={() => onSource(p)}>
          <ArrowUpRight size={12} /> Page {p}
        </button>
      ))}
    </div>
  );
}
function Notes({ pack, onSource, onExplain }) {
  const c = pack.content;
  return (
    <div className="notes-layout">
      <article className="notes-document">
        <div className="notes-kicker">
          <span className="eyebrow">THE BIG PICTURE</span>
          <span className="tag">Revision notes</span>
        </div>
        <h2>Let’s connect the dots.</h2>
        <p className="overview">{c.overview}</p>
        <div className="note-divider" />
        {c.topics.map((t, i) => (
          <section className="note-topic" key={i}>
            <div className="topic-number">{String(i + 1).padStart(2, "0")}</div>
            <div>
              <h3>{t.title}</h3>
              <p className="preserve-lines">{t.body}</p>
              <div className="topic-tools">
                <Citations pages={t.pages} onSource={onSource} />
                <button
                  className="text-button"
                  onClick={() => onExplain(t.title)}
                >
                  <Sparkles size={14} /> Explain simply
                </button>
              </div>
            </div>
          </section>
        ))}
        {c.formulas.length > 0 && (
          <section className="formula-section">
            <h3>Formulas to remember</h3>
            {c.formulas.map((f, i) => (
              <div key={i}>
                <code>{f.formula}</code>
                <p>{f.explanation}</p>
                <Citations pages={f.pages} onSource={onSource} />
              </div>
            ))}
          </section>
        )}
        <div className="notes-footnote">
          <BookOpen size={16} /> Check the source pages whenever you want to
          look closer.
        </div>
      </article>
      <aside className="terms-panel">
        <div className="eyebrow">KEEP THESE HANDY</div>
        <h3>Key terms</h3>
        {c.terms.map((t, i) => (
          <div key={i}>
            <strong>{t.term}</strong>
            <p>{t.definition}</p>
            <Citations pages={t.pages} onSource={onSource} />
          </div>
        ))}
      </aside>
    </div>
  );
}
function Quiz({ pack, attempt, onAttempt, onSource, sample }) {
  const [index, setIndex] = useState(attempt?.answers.length || 0),
    [selected, setSelected] = useState(null),
    [revealed, setRevealed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function start() {
    setBusy(true);
    setError("");
    try {
      let a;
      if (sample)
        a = {
          _id: "sample",
          answers: [],
          completed: false,
          score: 0,
          missedTopics: [],
        };
      else
        ({ attempt: a } = await api("/packs/" + pack._id + "/attempts", {
          method: "POST",
        }));
      onAttempt(a);
      setIndex(a.answers.length);
      setSelected(null);
      setRevealed(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (selected === null) return;
    setBusy(true);
    setError("");
    try {
      let a;
      if (sample) {
        const answers = [...attempt.answers, selected];
        a = {
          ...attempt,
          answers,
          completed: answers.length === 5,
          score: answers.filter((x, i) => x === pack.content.quiz[i].answer)
            .length,
          missedTopics: [
            ...new Set(
              pack.content.quiz
                .filter((q, i) => i < answers.length && answers[i] !== q.answer)
                .map((q) => q.topic),
            ),
          ],
        };
      } else
        ({ attempt: a } = await api(
          `/packs/${pack._id}/attempts/${attempt._id}`,
          { method: "PATCH", body: { index, answer: selected } },
        ));
      onAttempt(a);
      setRevealed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const q = pack.content.quiz[index];
  if (!attempt)
    return (
      <div className="practice-intro panel">
        <div className="practice-icon">
          <Target size={31} />
        </div>
        <span className="eyebrow">A LITTLE CHECK-IN WITH YOUR BRAIN</span>
        <h2>What’s sticking?</h2>
        <p>
          Five questions from your lecture. Take your time,
          <br />
          learn from each answer and find your next focus.
        </p>
        <div className="practice-facts">
          <span>5 questions</span>
          <span>No timer</span>
          <span>Explanations included</span>
        </div>
        <ErrorBox error={error} />
        <button className="button primary" disabled={busy} onClick={start}>
          Start practice <ArrowRight size={18} />
        </button>
      </div>
    );
  if ((attempt.completed && !revealed) || index >= 5)
    return (
      <div className="quiz-results panel">
        <span className="eyebrow">EVERY ATTEMPT IS PROGRESS</span>
        <div className="result-score">
          {attempt.score}
          <span>/ 5</span>
        </div>
        <h2>
          {attempt.score === 5
            ? "Look at those connections."
            : "You’ve found your next focus."}
        </h2>
        <p>
          {attempt.score === 5
            ? "You answered every question correctly. Keep the ideas fresh with flashcards."
            : "Mistakes are useful. Revisit these topics, then give it another go."}
        </p>
        <div className="missed-topics">
          {attempt.missedTopics.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
        <ErrorBox error={error} />
        <button className="button primary" disabled={busy} onClick={start}>
          <RotateCcw size={17} /> Practise again
        </button>
        <div className="answer-review">
          {pack.content.quiz.map((q, i) => (
            <div key={i}>
              <strong>
                {i + 1}. {q.question}
              </strong>
              <p>
                Your answer: {q.options[attempt.answers[i]]}{" "}
                {attempt.answers[i] === q.answer ? "✓" : "✕"}
              </p>
              <p>{q.explanation}</p>
              <Citations pages={q.pages} onSource={onSource} />
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="quiz-panel panel">
      <div className="quiz-top">
        <span className="eyebrow">QUESTION {index + 1} OF 5</span>
        <span className="tag">{q.topic}</span>
      </div>
      <progress max="5" value={index + (revealed ? 1 : 0)} />
      <h2>{q.question}</h2>
      <fieldset className="quiz-options">
        <legend className="sr-only">Choose one answer</legend>
        {q.options.map((option, i) => (
          <label
            key={i}
            className={
              (selected === i ? "selected " : "") +
              (revealed
                ? q.answer === i
                  ? "correct"
                  : selected === i
                    ? "incorrect"
                    : ""
                : "")
            }
          >
            <input
              type="radio"
              name="answer"
              value={i}
              disabled={revealed || busy}
              checked={selected === i}
              onChange={() => setSelected(i)}
            />
            <span className="option-letter">{String.fromCharCode(65 + i)}</span>
            <span>{option}</span>
            {revealed && q.answer === i && <Check size={18} />}
          </label>
        ))}
      </fieldset>
      {revealed && (
        <div
          className={
            "answer-explanation " + (selected === q.answer ? "right" : "wrong")
          }
          role="status"
        >
          <strong>
            {selected === q.answer
              ? "That’s right."
              : "A useful one to revisit."}
          </strong>
          <p>{q.explanation}</p>
          <Citations pages={q.pages} onSource={onSource} />
        </div>
      )}
      <ErrorBox error={error} />
      <div className="quiz-footer">
        <span>Your progress is saved as you go.</span>
        {revealed ? (
          <button
            className="button primary"
            onClick={() => {
              setIndex((i) => i + 1);
              setRevealed(false);
              setSelected(null);
            }}
          >
            {index === 4 ? "See my results" : "Next question"}
            <ArrowRight size={17} />
          </button>
        ) : (
          <button
            className="button primary"
            disabled={selected === null || busy}
            onClick={submit}
          >
            {busy ? "Saving…" : "Check answer"}
          </button>
        )}
      </div>
    </div>
  );
}
function Flashcards({ pack, cards, onCards, onSource, sample }) {
  const makeQueue = () =>
    pack.content.flashcards
      .map((_, i) => i)
      .sort((a, b) => {
        const rank = (i) => {
          const p = cards.find((c) => c.card === i);
          return p?.state === "review" ? 0 : p?.state === "known" ? 2 : 1;
        };
        return rank(a) - rank(b);
      });
  const [queue, setQueue] = useState(makeQueue),
    [position, setPosition] = useState(0),
    [flipped, setFlipped] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const index = queue[position],
    card = pack.content.flashcards[index];
  async function mark(state) {
    setBusy(true);
    setError("");
    try {
      let progress;
      if (sample) {
        const old = cards.find((c) => c.card === index);
        progress = { card: index, state, reviews: (old?.reviews || 0) + 1 };
      } else
        ({ progress } = await api(`/packs/${pack._id}/cards/${index}`, {
          method: "PUT",
          body: { state },
        }));
      onCards([...cards.filter((c) => c.card !== index), progress]);
      setPosition((p) => p + 1);
      setFlipped(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flashcard-area">
      <div className="section-heading">
        <div>
          <div className="eyebrow">ONE IDEA AT A TIME</div>
          <h2>Give your memory a little nudge.</h2>
        </div>
        <span className="tag">{Math.min(position + 1, 10)} / 10</span>
      </div>
      {card ? (
        <>
          <button
            className={"flashcard " + (flipped ? "flipped" : "")}
            onClick={() => setFlipped(!flipped)}
            aria-label={flipped ? "Hide answer" : "Reveal flashcard answer"}
          >
            <span className="eyebrow">
              {flipped ? "THE ANSWER" : card.topic}
            </span>
            <span className="flashcard-text">
              {flipped ? card.back : card.front}
            </span>
            <span className="flashcard-hint">
              <RotateCcw size={16} />
              {flipped
                ? "Click to see the question"
                : "Click or press Enter to reveal"}
            </span>
          </button>
          {flipped && (
            <>
              <Citations pages={card.pages} onSource={onSource} />
              <div className="flash-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => mark("review")}
                >
                  <RotateCcw size={17} /> Review again
                </button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => mark("known")}
                >
                  <Check size={17} /> Got it
                </button>
              </div>
            </>
          )}
          <ErrorBox error={error} />
          <p className="center small-text">
            Cards marked “Review again” come first in your next session.
          </p>
        </>
      ) : (
        <div className="panel practice-intro">
          <Check size={35} />
          <h2>A little more familiar now.</h2>
          <p>
            You reviewed all ten cards.{" "}
            {cards.filter((c) => c.state === "review").length} marked for
            another look.
          </p>
          <button
            className="button primary"
            onClick={() => {
              setQueue(makeQueue());
              setPosition(0);
              setFlipped(false);
            }}
          >
            Start another session <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
function Chat({ pack, messages, onMessages, onSource, sample, busyExternal }) {
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function ask(q) {
    if (!q.trim()) return;
    setBusy(true);
    setError("");
    try {
      let message;
      if (sample) {
        const lowered = q.toLowerCase();
        const match =
          lowered.includes("transport") ||
          lowered.includes("osmosis") ||
          lowered.includes("diffusion")
            ? 2
            : lowered.includes("organelle") ||
                lowered.includes("mitochond") ||
                lowered.includes("ribosome")
              ? 1
              : lowered.includes("cell")
                ? 0
                : -1;
        message = {
          question: q,
          answer:
            match < 0
              ? "I could not find that in your material."
              : pack.content.topics[match].body,
          pages: match < 0 ? [] : pack.content.topics[match].pages,
        };
      } else
        ({ message } = await api("/packs/" + pack._id + "/ask", {
          method: "POST",
          body: { question: q, kind: "question" },
        }));
      onMessages([...messages, message]);
      setQuestion("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="chat panel">
      <div className="chat-intro">
        <div className="practice-icon">
          <Sparkles size={24} />
        </div>
        <h2>A question is a good place to start.</h2>
        <p>
          {sample
            ? "Try the curated sample answers below. Live AI is available for your own study packs."
            : "Ask about your lecture. Answers stay connected to the source."}
        </p>
      </div>
      {!messages.length && (
        <div className="suggestions">
          {(sample
            ? [
                "What are cells?",
                "What do organelles do?",
                "Explain membrane transport",
              ]
            : pack.content.topics.slice(0, 3).map((t) => "Explain " + t.title)
          ).map((q) => (
            <button
              key={q}
              disabled={busy || busyExternal}
              onClick={() => ask(q)}
            >
              {q}
              <ArrowUpRight size={16} />
            </button>
          ))}
        </div>
      )}
      <div className="messages" aria-live="polite">
        {messages.map((m, i) => (
          <div className="message-pair" key={m._id || i}>
            <div className="question-bubble">{m.question}</div>
            <div className="answer-bubble">
              <span className="answer-brand">
                <Sparkles size={16} />
                {sample ? "Sample answer" : "ExamMitra AI"}
              </span>
              <p className="preserve-lines">{m.answer}</p>
              <Citations pages={m.pages} onSource={onSource} />
            </div>
          </div>
        ))}
        {(busy || busyExternal) && (
          <div className="notice" role="status">
            <Loader2 className="spin" size={18} /> Looking through your
            material…
          </div>
        )}
      </div>
      <ErrorBox error={error} />
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          ask(question);
        }}
      >
        <textarea
          aria-label="Question about your material"
          placeholder="What would you like to understand?"
          required
          maxLength={1500}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows="2"
        />
        <button
          className="button primary"
          disabled={!question.trim() || busy || busyExternal}
          aria-label="Send question"
        >
          <Send size={18} />
        </button>
      </form>
      <p className="small-text center">
        AI can make mistakes. Check the source when it matters.
      </p>
    </div>
  );
}
function Source({ page, setPage, pack, sample }) {
  return (
    <aside className="source-panel">
      <div className="source-header">
        <strong>
          <FileText size={17} /> Original material
        </strong>
        <button
          className="icon-button"
          aria-label="Close source viewer"
          onClick={() => setPage(null)}
        >
          <X size={19} />
        </button>
      </div>
      <div className="source-toolbar">
        <label>
          Page{" "}
          <select
            aria-label="Source page"
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {Array.from({ length: pack.pageCount }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </select>{" "}
          of {pack.pageCount}
        </label>
        <a
          target="_blank"
          rel="noreferrer"
          aria-label="Open PDF in a new tab"
          href={
            (sample ? "/sample-biology.pdf" : `/api/packs/${pack._id}/source`) +
            "#page=" +
            page
          }
        >
          <ExternalLink size={17} />
        </a>
      </div>
      <iframe
        key={page}
        className="source-frame"
        title={`Original PDF, page ${page}`}
        src={
          (sample ? "/sample-biology.pdf" : `/api/packs/${pack._id}/source`) +
          "#page=" +
          page +
          "&toolbar=0"
        }
      />
      {sample && (
        <details className="source-text">
          <summary>Read page text</summary>
          <p>{samplePages[page - 1].text}</p>
        </details>
      )}
    </aside>
  );
}
function Export({ pack, sample, onClose }) {
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function download(kind, format) {
    setBusy(kind + format);
    setError("");
    try {
      const res = await fetch(
        `/api/${sample ? "sample" : `packs/${pack._id}`}/export?kind=${kind}&format=${format}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const r = await res.json();
        throw new Error(r.error);
      }
      const blob = await res.blob(),
        url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pack.title}-${kind}.${format}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  }
  return (
    <Modal title="Take your learning with you." onClose={onClose}>
      <p>
        Download your notes, or practise offline with a quiz and a separate
        answer-key section.
      </p>
      <ErrorBox error={error} />
      <div className="export-options">
        {[
          ["notes", "pdf", "Revision notes", "PDF document"],
          ["notes", "md", "Revision notes", "Markdown text"],
          [
            "quiz",
            "pdf",
            "Practice quiz + answer key",
            "PDF · answers on a separate page",
          ],
          [
            "quiz",
            "md",
            "Practice quiz + answer key",
            "Markdown · separate answer section",
          ],
        ].map(([kind, format, title, subtitle]) => (
          <button
            key={kind + format}
            className="export-option"
            disabled={!!busy}
            onClick={() => download(kind, format)}
          >
            <FileText />
            <span>
              <strong>{title}</strong>
              <small>{subtitle}</small>
            </span>
            {busy === kind + format ? (
              <Loader2 className="spin" size={19} />
            ) : (
              <Download size={19} />
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}
