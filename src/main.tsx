import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { StoreProvider } from "./state/store";
import { AuthProvider } from "./state/auth";
import "./styles.css";

// Apply the theme before first paint — including on the auth screen, which
// doesn't render the ThemeToggle that used to own this.
{
  const saved = localStorage.getItem("orsync.theme");
  const theme =
    saved === "dark" || saved === "light"
      ? saved
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  document.documentElement.setAttribute("data-theme", theme);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <StoreProvider>
          <App />
        </StoreProvider>
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);

// Register the service worker for offline/installable PWA behavior.
// Skipped under Capacitor's native shell, which serves its own bundle.
if ("serviceWorker" in navigator && !/(android|ios);capacitor/i.test(navigator.userAgent)) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline support is a progressive enhancement; ignore failures */
    });
  });
}
