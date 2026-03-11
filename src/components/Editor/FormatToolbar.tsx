import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import {
  ChevronDown,
  SquareCheck,
  List,
  ListOrdered,
  Bold,
  Italic,
  Highlighter,
} from "lucide-react";

interface FormatToolbarProps {
  editor: Editor;
}

const BTN_BASE: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 6,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(0,0,0,0.45)",
  transition: "background 0.1s, color 0.1s",
  flexShrink: 0,
  padding: 0,
};

const BTN_HOVER: React.CSSProperties = {
  background: "rgba(0,0,0,0.06)",
  color: "rgba(0,0,0,0.75)",
};

const BTN_ACTIVE: React.CSSProperties = {
  background: "rgba(99,102,241,0.10)",
  color: "#6366F1",
};

const DIVIDER = (
  <div
    style={{
      width: 1,
      height: 18,
      background: "rgba(0,0,0,0.1)",
      margin: "0 4px",
      flexShrink: 0,
    }}
  />
);

function ToolButton({
  isActive,
  onClick,
  children,
  style,
  title,
}: {
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
  title?: string;
}) {
  const [hovered, setHovered] = useState(false);

  const computedStyle: React.CSSProperties = {
    ...BTN_BASE,
    ...(hovered ? BTN_HOVER : {}),
    ...(isActive ? BTN_ACTIVE : {}),
    ...style,
  };

  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      style={computedStyle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
    >
      {children}
    </button>
  );
}

function getHeadingLabel(editor: Editor): string {
  if (editor.isActive("heading", { level: 1 })) return "H1";
  if (editor.isActive("heading", { level: 2 })) return "H2";
  if (editor.isActive("heading", { level: 3 })) return "H3";
  return "Text";
}

const DROPDOWN_PANEL: React.CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: 0,
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  padding: 4,
  zIndex: 100,
  minWidth: 120,
};

function DropdownItem({
  isActive,
  onClick,
  children,
}: {
  isActive?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 5,
        border: "none",
        background: isActive
          ? "rgba(99,102,241,0.08)"
          : hovered
          ? "rgba(0,0,0,0.05)"
          : "transparent",
        cursor: "pointer",
        fontSize: 13,
        color: isActive ? "#6366F1" : "#1c1c1e",
        width: "100%",
        textAlign: "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function FormatToolbar({ editor }: FormatToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<"heading" | "list" | null>(
    null
  );
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (!toolbarRef.current?.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDropdown]);

  const headingLabel = getHeadingLabel(editor);
  const isListActive =
    editor.isActive("bulletList") || editor.isActive("orderedList");

  return (
    <div
      ref={toolbarRef}
      style={{
        height: 44,
        background: "#ffffff",
        borderTop: "1px solid rgba(0,0,0,0.07)",
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 2,
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      {/* Heading dropdown */}
      <div style={{ position: "relative" }}>
        <ToolButton
          isActive={headingLabel !== "Text"}
          onClick={() =>
            setOpenDropdown(openDropdown === "heading" ? null : "heading")
          }
          style={{ width: "auto", padding: "0 6px", gap: 3 }}
          title="Heading"
        >
          <span style={{ fontSize: 12, fontWeight: 500, letterSpacing: -0.2 }}>
            {headingLabel}
          </span>
          <ChevronDown size={12} />
        </ToolButton>

        {openDropdown === "heading" && (
          <div style={DROPDOWN_PANEL}>
            <DropdownItem
              isActive={!editor.isActive("heading")}
              onClick={() => {
                editor.chain().focus().setParagraph().run();
                setOpenDropdown(null);
              }}
            >
              <span style={{ fontSize: 13 }}>Text</span>
            </DropdownItem>
            {([1, 2, 3] as const).map((level) => (
              <DropdownItem
                key={level}
                isActive={editor.isActive("heading", { level })}
                onClick={() => {
                  editor.chain().focus().toggleHeading({ level }).run();
                  setOpenDropdown(null);
                }}
              >
                <span
                  style={{
                    fontSize: level === 1 ? 15 : level === 2 ? 13 : 12,
                    fontWeight: 600,
                  }}
                >
                  H{level}
                </span>
                <span style={{ fontSize: 12, color: "rgba(0,0,0,0.4)" }}>
                  Heading {level}
                </span>
              </DropdownItem>
            ))}
          </div>
        )}
      </div>

      {DIVIDER}

      {/* Task list */}
      <ToolButton
        isActive={editor.isActive("taskList")}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >
        <SquareCheck size={15} />
      </ToolButton>

      {/* List dropdown */}
      <div style={{ position: "relative" }}>
        <ToolButton
          isActive={isListActive}
          onClick={() =>
            setOpenDropdown(openDropdown === "list" ? null : "list")
          }
          style={{ width: "auto", padding: "0 6px", gap: 3 }}
          title="List"
        >
          <List size={15} />
          <ChevronDown size={12} />
        </ToolButton>

        {openDropdown === "list" && (
          <div style={DROPDOWN_PANEL}>
            <DropdownItem
              isActive={editor.isActive("bulletList")}
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                setOpenDropdown(null);
              }}
            >
              <List size={14} />
              <span>Bullet list</span>
            </DropdownItem>
            <DropdownItem
              isActive={editor.isActive("orderedList")}
              onClick={() => {
                editor.chain().focus().toggleOrderedList().run();
                setOpenDropdown(null);
              }}
            >
              <ListOrdered size={14} />
              <span>Numbered list</span>
            </DropdownItem>
          </div>
        )}
      </div>

      {DIVIDER}

      {/* Bold */}
      <ToolButton
        isActive={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={15} />
      </ToolButton>

      {/* Italic */}
      <ToolButton
        isActive={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={15} />
      </ToolButton>

      {DIVIDER}

      {/* Highlight */}
      <ToolButton
        isActive={editor.isActive("highlight")}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        <Highlighter size={15} />
      </ToolButton>
    </div>
  );
}
