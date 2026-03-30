import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastContainer } from "./components/Toast";

import { checkForUpdates } from "./lib/updater";

if (import.meta.env.DEV) {
  import("tauri-plugin-mcp").then(({ setupPluginListeners }) => {
    setupPluginListeners();
  });
}

// Check for updates on launch (non-blocking)
checkForUpdates();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <ToastContainer />
    </ErrorBoundary>
  </React.StrictMode>,
);
