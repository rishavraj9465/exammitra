import React, { useEffect, useRef } from "react";
import {
  Link,
  NavLink,
  Outlet,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  BookOpen,
  LayoutDashboard,
  Library,
  ChartNoAxesCombined,
  Settings,
  Plus,
  LogOut,
  ArrowUpRight,
  AlertCircle,
  Loader2,
  X,
  Sun,
  Moon,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { creator } from "../../shared/creator";
import { useApp } from "./context";
import { api } from "./api";
export function Brand() {
  return (
    <Link className="brand" to="/" aria-label="ExamMitra home">
      <img
        className="brand-logo"
        src="/brand/exammitra-logo.png"
        alt="ExamMitra"
      />
    </Link>
  );
}
export function Footer({ full = false }) {
  return (
    <footer className={full ? "full-footer" : "compact-footer"}>
      {full && (
        <div className="footer-grid">
          <div>
            <Brand />
            <p>
              A calmer space to understand your lectures
              <br />
              and practise what matters.
            </p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link to="/sample">Try a sample</Link>
            <Link to="/app">My workspace</Link>
            <Link to="/privacy">Privacy & your data</Link>
          </div>
          <div>
            <h4>About the creator</h4>
            <p>{creator.name}</p>
            <a href={creator.linkedin} target="_blank" rel="noreferrer">
              Connect on LinkedIn ↗
            </a>
          </div>
        </div>
      )}
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} ExamMitra AI</span>
        <span>
          Made with <span className="heart">❤️</span> by{" "}
          <a href={creator.linkedin} target="_blank" rel="noreferrer">
            {creator.name}
          </a>
        </span>
        {!full && <Link to="/privacy">Privacy</Link>}
      </div>
    </footer>
  );
}
export function ErrorBox({ error }) {
  return error ? (
    <div className="notice error" role="alert">
      <AlertCircle size={19} />
      <span>{error.message || error}</span>
    </div>
  ) : null;
}
export function Loading({ text = "Loading your workspace…" }) {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" />
      <p>{text}</p>
    </div>
  );
}
export function Modal({ title, children, onClose }) {
  const ref = useRef();
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children}
    </div>
  );
}
export function ThemeToggle() {
  const { theme, setTheme } = useApp();
  return (
    <button
      className="icon-button"
      aria-label="Toggle light or dark mode"
      onClick={() =>
        setTheme(
          theme === "dark" ||
            (theme === "system" &&
              matchMedia("(prefers-color-scheme: dark)").matches)
            ? "light"
            : "dark",
        )
      }
    >
      {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
const links = [
  ["/app", LayoutDashboard, "Home"],
  ["/app/library", Library, "Library"],
  ["/app/progress", ChartNoAxesCombined, "Progress"],
  ["/app/settings", Settings, "Settings"],
];
export function Shell() {
  const { user, loading, setUser } = useApp(),
    location = useLocation(),
    navigate = useNavigate();
  const [error, setError] = React.useState(""),
    [profileOpen, setProfileOpen] = React.useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const closeProfile = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("pointerdown", closeProfile);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeProfile);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function signOut() {
    try {
      await api("/auth/logout", { method: "POST" });
      setProfileOpen(false);
      setUser(null);
      navigate("/");
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) return <Loading />;
  if (!user)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Link to="/app/upload" className="button primary sidebar-upload">
          <Plus size={18} /> New study pack
        </Link>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav>
          {links.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} end>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-tip">
          <BookOpen size={23} />
          <h4>
            A little progress,
            <br />
            every day.
          </h4>
          <p>
            Understanding starts with
            <br />
            one good question.
          </p>
          <Link to="/sample">
            Explore the sample <ArrowUpRight size={14} />
          </Link>
        </div>
        <div className="user-box">
          <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div>
          <span>
            <strong>{user.name}</strong>
            <small>Personal workspace</small>
          </span>
          <button
            className="icon-button"
            aria-label="Sign out"
            onClick={signOut}
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={14} />{" "}
            <span>
              {links.find(([to]) => to === location.pathname)?.[2] ||
                "Study space"}
            </span>
          </div>
          <div>
            <Link to="/sample" className="sample-link">
              Try the sample
            </Link>
            <ThemeToggle />
            <div className="home-profile-wrap app-profile-wrap" ref={profileRef}>
              <button
                className="topbar-profile-button"
                type="button"
                aria-label={`Open ${user.name}'s profile menu`}
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setError("");
                  setProfileOpen((open) => !open);
                }}
              >
                <span className="avatar small">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="home-profile-menu" role="menu">
                  <div className="home-profile-details">
                    <span className="avatar">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  <Link
                    to="/app/settings"
                    role="menuitem"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Settings size={16} /> Profile settings
                  </Link>
                  <button type="button" role="menuitem" onClick={signOut}>
                    <LogOut size={16} /> Sign out
                  </button>
                  {error && (
                    <small className="profile-error" role="alert">
                      {error}
                    </small>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="app-main">
          <ErrorBox error={error} />
          <Outlet />
        </main>
        <Footer />
      </div>
      <nav className="mobile-nav">
        {links.map(([to, Icon, label]) => (
          <NavLink key={to} to={to} end>
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
export function Privacy() {
  return (
    <>
      <header className="public-nav">
        <Brand />
        <Link className="button secondary" to="/">
          Back home
        </Link>
      </header>
      <main className="legal">
        <h1>Your material stays yours.</h1>
        <p>
          ExamMitra AI stores your account profile, password hash, uploaded PDF,
          extracted text, generated study material, practice progress and
          document conversations so you can resume studying.
        </p>
        <h2>How AI processing works</h2>
        <p>
          When you generate a study pack or ask a question, relevant extracted
          text and your question are sent to Google’s Gemini API. Do not upload
          material you do not have permission to share with that service. AI
          answers can contain mistakes; use the linked source pages to check
          them.
        </p>
        <h2>Storage and access</h2>
        <p>
          Uploaded files are stored in a private server directory during local
          development or a configured private object-storage bucket after
          deployment. Account data is stored in MongoDB. Access to study packs
          and source files requires the owning account.
        </p>
        <h2>Deleting a study pack</h2>
        <p>
          Deleting a pack removes its uploaded file, extracted text, generated
          content, quiz attempts, flashcard progress and conversations from the
          application’s active storage. Any separate infrastructure backups and
          Google’s retention policies are managed by those providers.
        </p>
        <h2>Device preferences and sample</h2>
        <p>
          This browser stores your theme preference. Sample practice progress is
          saved on this device only and is separate from your account. The
          sample is curated content, not a live AI response.
        </p>
      </main>
      <Footer full />
    </>
  );
}
