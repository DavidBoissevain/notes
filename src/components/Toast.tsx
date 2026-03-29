import { useEffect, useState } from "react";
import { onError } from "../lib/toast";
import { CircleAlert, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
}

let nextId = 0;

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    return onError((message) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 6000);
    });
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 16,
      right: 16,
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      pointerEvents: "none",
    }}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            background: "var(--accent-red-strong)",
            color: "white",
            padding: "10px 14px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
            animation: "toast-slide-in 0.25s ease-out",
            maxWidth: 360,
            pointerEvents: "auto",
          }}
        >
          <CircleAlert size={15} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
