import { check, type Update } from "@tauri-apps/plugin-updater";

export type UpdateStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; update: Update; version: string }
  | { state: "downloading"; progress: number }
  | { state: "ready" }
  | { state: "error"; message: string }
  | { state: "up-to-date" };

type Listener = (status: UpdateStatus) => void;
const listeners = new Set<Listener>();
let current: UpdateStatus = { state: "idle" };

export function getUpdateStatus(): UpdateStatus {
  return current;
}

function setStatus(status: UpdateStatus) {
  current = status;
  for (const fn of listeners) fn(status);
}

export function onUpdateStatus(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export async function checkForUpdates() {
  setStatus({ state: "checking" });
  try {
    const update = await check();
    if (update) {
      setStatus({ state: "available", update, version: update.version });
    } else {
      setStatus({ state: "up-to-date" });
      // Reset to idle after 3s
      setTimeout(() => { if (current.state === "up-to-date") setStatus({ state: "idle" }); }, 3000);
    }
  } catch (e) {
    setStatus({ state: "error", message: String(e) });
  }
}

export async function installUpdate() {
  if (current.state !== "available") return;
  const { update } = current;
  setStatus({ state: "downloading", progress: 0 });
  try {
    let totalBytes = 0;
    let downloadedBytes = 0;
    await update.downloadAndInstall((event) => {
      if (event.event === "Started" && event.data.contentLength) {
        totalBytes = event.data.contentLength;
      } else if (event.event === "Progress") {
        downloadedBytes += event.data.chunkLength;
        const progress = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        setStatus({ state: "downloading", progress });
      } else if (event.event === "Finished") {
        setStatus({ state: "ready" });
      }
    });
    setStatus({ state: "ready" });
  } catch (e) {
    setStatus({ state: "error", message: String(e) });
  }
}
