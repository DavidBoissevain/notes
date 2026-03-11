import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

const win = getCurrentWindow();

export function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      style={{
        height: "44px",
        flexShrink: 0,
        background: "#2F3235",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        paddingLeft: "16px",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div style={{ display: "flex" }}>
        <WindowButton onClick={() => win.minimize()} label="Minimize" hoverColor="rgba(255,255,255,0.1)">
          <Minus size={13} strokeWidth={1.5} />
        </WindowButton>
        <WindowButton onClick={() => win.toggleMaximize()} label="Maximize" hoverColor="rgba(255,255,255,0.1)">
          <Square size={11} strokeWidth={1.5} />
        </WindowButton>
        <WindowButton
          onClick={() => win.close()}
          label="Close"
          hoverColor="rgba(196,43,28,0.88)"
          hoverIconColor="white"
          isClose
        >
          <X size={13} strokeWidth={1.5} />
        </WindowButton>
      </div>
    </div>
  );
}

function WindowButton({
  onClick,
  label,
  children,
  hoverColor,
  hoverIconColor,
  isClose,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  hoverColor: string;
  hoverIconColor?: string;
  isClose?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: isClose ? "54px" : "44px",
        height: "44px",
        border: "none",
        background: "transparent",
        cursor: "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "rgba(255, 255, 255, 0.38)",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverColor;
        e.currentTarget.style.color = hoverIconColor ?? "rgba(255, 255, 255, 0.85)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "rgba(255, 255, 255, 0.38)";
      }}
    >
      {children}
    </button>
  );
}
