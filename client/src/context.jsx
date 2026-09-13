import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";
const Context = createContext();
export function Provider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [health, setHealth] = useState(null),
    [theme, setTheme] = useState(() => {
      if (!localStorage.getItem("studyspace-light-default-v2")) {
        localStorage.setItem("studyspace-light-default-v2", "applied");
        return "light";
      }
      return localStorage.getItem("studyspace-theme") || "light";
    });
  useEffect(() => {
    api("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() =>
        api("/auth/guest", { method: "POST" }).then((r) => setUser(r.user)),
      )
      .catch(() => {})
      .finally(() => setLoading(false));
    api("/health")
      .then(setHealth)
      .catch(() =>
        setHealth({ ok: false, database: false, aiConfigured: false }),
      );
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme);
    apply();
    localStorage.setItem("studyspace-theme", theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  return (
    <Context.Provider
      value={{ user, setUser, loading, health, theme, setTheme }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
