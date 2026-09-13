import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CircleCheck,
  FileText,
  Layers3,
  MessageCircleQuestion,
  Sparkles,
  WandSparkles,
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { Footer, Brand } from "./ui";
import { useApp } from "./context";
import { api } from "./api";

export default function Landing() {
  const { user, loading, setUser } = useApp();
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const profileRef = useRef(null);

  useEffect(() => {
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeProfile);
    return () => document.removeEventListener("pointerdown", closeProfile);
  }, []);

  const signOut = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      setProfileOpen(false);
      setUser(null);
    } catch (error) {
      setProfileError(error.message);
    }
  };
  return (
    <>
      <header className="public-nav">
        <Brand />
        <nav>
          <a href="#how">How it works</a>
          <a href="#faq">FAQs</a>
          {!loading &&
            (user ? (
              <>
                <Link className="nav-workspace" to="/app">
                  My workspace
                </Link>
                <Link className="button primary" to="/app/upload">
                  New study pack <ArrowUpRight size={17} />
                </Link>
                <div className="home-profile-wrap" ref={profileRef}>
                  <button
                    className="home-profile"
                    type="button"
                    aria-label={`Open ${user.name}'s profile menu`}
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    onClick={() => {
                      setProfileError("");
                      setProfileOpen((open) => !open);
                    }}
                  >
                    <span className="avatar">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.guest ? "Guest workspace" : user.email}</small>
                    </span>
                    <ChevronDown size={15} />
                  </button>
                  {profileOpen && (
                    <div className="home-profile-menu" role="menu">
                      <div className="home-profile-details">
                        <span className="avatar">
                          {user.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.guest ? "Guest workspace" : user.email}</small>
                        </span>
                      </div>
                      <Link to="/app/settings" role="menuitem">
                        <Settings size={16} /> Profile settings
                      </Link>
                      {!user.guest && (
                        <button type="button" role="menuitem" onClick={signOut}>
                          <LogOut size={16} /> Sign out
                        </button>
                      )}
                      {profileError && (
                        <small className="profile-error" role="alert">
                          {profileError}
                        </small>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link className="button primary" to="/app/upload">
                  Start studying <ArrowUpRight size={17} />
                </Link>
              </>
            ))}
        </nav>
      </header>

      <main className="landing landing-v2">
        <section className="hero-v2 hero-v3">
          <div className="hero-v2-glow" aria-hidden="true" />
          <div className="hero-v2-copy">
            <span className="hero-kicker">
              AI workspace for college students
            </span>
            <h1>
              Turn lecture notes into
              <br />
              <em>real understanding.</em>
            </h1>
            <p>
              ExamMitra AI turns a lecture PDF into clear notes, practice
              questions and flashcards—with every answer linked to its source.
            </p>
            <div className="hero-v2-actions">
              <Link
                className="button primary"
                to="/app/upload"
              >
                {user ? "New study pack" : "Create a study pack"}{" "}
                <ArrowUpRight size={18} />
              </Link>
              <Link className="button demo-button" to="/sample">
                View sample pack
              </Link>
            </div>
            <div className="hero-v2-proof">
              <span>
                <CircleCheck size={15} /> Free to try
              </span>
              <span>
                <CircleCheck size={15} /> No credit card
              </span>
              <span>
                <CircleCheck size={15} /> Your sources cited
              </span>
            </div>
          </div>

          <div
            className="product-canvas"
            aria-label="ExamMitra AI workspace preview"
          >
            <div className="canvas-aura" aria-hidden="true" />
            <div className="product-window">
              <div className="window-bar">
                <div className="window-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="window-title">My study workspace</div>
                <div className="window-ready">
                  <i /> Study pack ready
                </div>
              </div>
              <div className="window-layout">
                <aside className="window-rail" aria-hidden="true">
                  <span className="active">
                    <FileText />
                  </span>
                  <span>
                    <BrainCircuit />
                  </span>
                  <span>
                    <Layers3 />
                  </span>
                  <span>
                    <MessageCircleQuestion />
                  </span>
                </aside>
                <div className="window-document">
                  <div className="document-head">
                    <div>
                      <span>CONTINUE LEARNING</span>
                      <h2>Cell Biology</h2>
                    </div>
                    <span className="document-pages">12 pages</span>
                  </div>
                  <nav className="document-tabs" aria-label="Preview tabs">
                    <b>Revision notes</b>
                    <span>
                      Quiz <small>5</small>
                    </span>
                    <span>
                      Flashcards <small>10</small>
                    </span>
                    <span>Ask AI</span>
                  </nav>
                  <div className="document-body">
                    <span className="section-index">01</span>
                    <div>
                      <span className="document-kicker">LECTURE 04</span>
                      <h3>Cell structure &amp; function</h3>
                      <p>
                        Cells are the basic structural and functional units of
                        life. Each organelle has a specific role that keeps the
                        whole system working.
                      </p>
                      <div className="key-idea-card">
                        <WandSparkles size={18} />
                        <div>
                          <b>The idea to remember</b>
                          <p>
                            Structure determines function—from the nucleus
                            storing DNA to mitochondria producing energy.
                          </p>
                        </div>
                      </div>
                      <span className="page-chip">
                        <FileText size={12} /> Source · Page 2
                      </span>
                    </div>
                  </div>
                </div>
                <aside className="window-insights">
                  <span className="insights-label">YOUR MOMENTUM</span>
                  <div className="score-ring">
                    <strong>
                      4<span>/5</span>
                    </strong>
                    <small>Quiz score</small>
                  </div>
                  <div className="mastery-row">
                    <span>
                      <i />
                      Cell structure
                    </span>
                    <b>Strong</b>
                  </div>
                  <div className="mastery-row review">
                    <span>
                      <i />
                      Membrane transport
                    </span>
                    <b>Review</b>
                  </div>
                  <div className="next-step">
                    <Sparkles size={16} />
                    <span>
                      <b>Next best step</b>
                      <small>Review 3 flashcards</small>
                    </span>
                    <ArrowUpRight size={14} />
                  </div>
                </aside>
              </div>
            </div>
            <div className="ask-float" aria-hidden="true">
              <span>
                <Sparkles size={15} />
              </span>
              <div>
                <small>ASK YOUR MATERIAL</small>
                <b>“Why do cells need ATP?”</b>
              </div>
              <i>
                <ArrowUpRight size={15} />
              </i>
            </div>
          </div>
        </section>

        <section className="feature-bento" aria-label="ExamMitra AI capabilities">
          <article className="bento-main">
            <span className="bento-icon">
              <FileText />
            </span>
            <div>
              <small>UNDERSTAND</small>
              <h2>Notes that show their work.</h2>
              <p>
                Every explanation stays connected to the original lecture page,
                so students can verify instead of blindly trusting AI.
              </p>
            </div>
            <div className="citation-demo">
              <span>Cell membrane</span>
              <b>Page 3 ↗</b>
            </div>
          </article>
          <article>
            <span className="bento-icon mint">
              <BrainCircuit />
            </span>
            <small>PRACTISE</small>
            <h3>Questions that teach.</h3>
            <p>
              Instant feedback explains the answer and surfaces topics worth
              another look.
            </p>
          </article>
          <article>
            <span className="bento-icon coral">
              <MessageCircleQuestion />
            </span>
            <small>ASK</small>
            <h3>Answers from your material.</h3>
            <p>If the PDF cannot answer it, ExamMitra AI says so clearly.</p>
          </article>
        </section>

        <section id="how" className="steps steps-v2">
          <div>
            <span className="eyebrow">ONE FLOW. ZERO BUSYWORK.</span>
            <h2>From PDF to prepared.</h2>
          </div>
          {["Drop your lecture", "Let AI organise it", "Learn by doing"].map(
            (title, index) => (
              <article key={title}>
                <span className="step-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>
                  {
                    [
                      "Upload one text-based PDF and choose your study style.",
                      "Get concise notes, key terms and citations to every source page.",
                      "Practise with quizzes, flashcards and grounded questions.",
                    ][index]
                  }
                </p>
              </article>
            ),
          )}
        </section>

        <section id="faq" className="faq faq-v2">
          <div>
            <span className="eyebrow">THE QUICK VERSION</span>
            <h2>
              Good questions.
              <br />
              Clear answers.
            </h2>
          </div>
          <div>
            <details>
              <summary>What can I upload?</summary>
              <p>Text-based lecture PDFs under 3 MB and up to 100 pages.</p>
            </details>
            <details>
              <summary>Can I try it without an account?</summary>
              <p>
                Yes. The live sample lets you explore notes, a quiz, flashcards
                and source citations.
              </p>
            </details>
            <details>
              <summary>Does AI invent information?</summary>
              <p>
                Answers are restricted to your uploaded material and cite source
                pages. When the answer is unavailable, ExamMitra AI says so.
              </p>
            </details>
          </div>
        </section>
      </main>
      <Footer full />
    </>
  );
}
