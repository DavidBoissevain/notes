import { getCurrentWindow } from "@tauri-apps/api/window";

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

export function TitleBar({ maximized }: { maximized: boolean }) {
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
          <span style={mdl2Style}>{MDL2.minimize}</span>
        </WindowButton>
        <WindowButton onClick={() => win.toggleMaximize()} label={maximized ? "Restore" : "Maximize"} hoverColor="rgba(255,255,255,0.1)">
          <span style={mdl2Style}>{maximized ? MDL2.restore : MDL2.maximize}</span>
        </WindowButton>
        <WindowButton
          onClick={() => win.close()}
          label="Close"
          hoverColor="rgba(196,43,28,0.88)"
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
