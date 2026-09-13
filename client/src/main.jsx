import React from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { Provider } from "./context";
import { Shell, Privacy } from "./ui";
import Landing from "./Landing";
import { Dashboard, Library, Upload, Progress, Settings } from "./pages";
import Workspace from "./Workspace";
import "./styles.css";
class ErrorBoundary extends React.Component {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="legal">
        <h1>Something didn’t load correctly.</h1>
        <p>Your saved study material is still there. Refresh to try again.</p>
        <button className="button primary" onClick={() => location.reload()}>
          Reload page
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
function ScrollReset() {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <BrowserRouter>
      <Provider>
        <ScrollReset />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Navigate to="/app" replace />} />
          <Route path="/register" element={<Navigate to="/app" replace />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/sample" element={<Workspace sample />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="library" element={<Library />} />
            <Route path="upload" element={<Upload />} />
            <Route path="progress" element={<Progress />} />
            <Route path="settings" element={<Settings />} />
            <Route path="packs/:id" element={<Workspace />} />
          </Route>
          <Route
            path="*"
            element={
              <main className="legal">
                <h1>A page out of place.</h1>
                <p>This page does not exist.</p>
                <Link className="button primary" to="/">
                  Back home
                </Link>
              </main>
            }
          />
        </Routes>
      </Provider>
    </BrowserRouter>
  </ErrorBoundary>,
);
