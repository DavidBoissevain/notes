import { getCurrentWindow } from "@tauri-apps/api/window";
import { PanelLeft, PanelLeftClose } from "lucide-react";

const win = getCurrentWindow();

// Segoe MDL2 Assets — Windows native titlebar glyphs
const MDL2 = {
  minimize: "\uE921",  // ChromeMinimize
  maximize: "\uE922",  // ChromeMaximize
  restore:  "\uE923",  // ChromeRestore
  close:    "\uE8BB",  // ChromeClose
};

const mdl2Style: React.CSSProperties = {
  fontFamily: "'Segoe MDL2 Assets'",
  fontSize: "10px",
  lineHeight: 1,
};

export function TitleBar({
  maximized,
  sidebarCollapsed,
  onToggleSidebar,
}: {
  maximized: boolean;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <div
      data-tauri-drag-region
      style={{
        height: "44px",
        flexShrink: 0,
        background: "#ffffff",
        borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Left: sidebar toggle */}
      <div style={{ display: "flex", paddingLeft: "12px" }}>
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          style={{
            width: "32px",
            height: "32px",
            border: "none",
            background: "transparent",
            borderRadius: "6px",
            cursor: "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(0, 0, 0, 0.35)",
            transition: "background 0.1s, color 0.1s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
            e.currentTarget.style.color = "rgba(0, 0, 0, 0.7)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "rgba(0, 0, 0, 0.35)";
          }}
        >
          {sidebarCollapsed ? (
            <PanelLeft size={16} />
          ) : (
            <PanelLeftClose size={16} />
          )}
        </button>
      </div>

      {/* Right: window controls */}
      <div style={{ display: "flex" }}>
        <WindowButton
          onClick={() => win.minimize()}
          label="Minimize"
          hoverColor="rgba(0, 0, 0, 0.06)"
        >
          <span style={mdl2Style}>{MDL2.minimize}</span>
        </WindowButton>
        <WindowButton
          onClick={() => win.toggleMaximize()}
          label={maximized ? "Restore" : "Maximize"}
          hoverColor="rgba(0, 0, 0, 0.06)"
        >
          <span style={mdl2Style}>
            {maximized ? MDL2.restore : MDL2.maximize}
          </span>
        </WindowButton>
        <WindowButton
          onClick={() => win.close()}
          label="Close"
          hoverColor="rgba(196, 43, 28, 0.88)"
          hoverIconColor="white"
          isClose
        >
          <span style={mdl2Style}>{MDL2.close}</span>
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
        color: "rgba(0, 0, 0, 0.35)",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverColor;
        e.currentTarget.style.color =
          hoverIconColor ?? "rgba(0, 0, 0, 0.7)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "rgba(0, 0, 0, 0.35)";
      }}
    >
      {children}
    </button>
  );
}
