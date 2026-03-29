import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  ChevronDown,
  SquareCheck,
  List,
  ListOrdered,
  Bold,
  Italic,
  Highlighter,
  Link as LinkIcon,
  Table,
  Image,
  MoreHorizontal,
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
  color: "var(--text-secondary)",
  transition: "background 0.1s, color 0.1s",
  flexShrink: 0,
  padding: 0,
};

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
    ...(hovered ? { background: "var(--bg-active)", color: "var(--text-icon-hover)" } : {}),
    ...(isActive ? { background: "var(--accent-indigo-tint)", color: "var(--accent-indigo)" } : {}),
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

const DROPDOWN_PANEL: React.CSSProperties = {
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: 0,
  background: "var(--bg-popover)",
  border: "1px solid var(--border-input)",
  borderRadius: 8,
  boxShadow: "var(--shadow-menu)",
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
          ? "var(--accent-indigo-tint)"
          : hovered
          ? "var(--bg-hover-strong)"
          : "transparent",
        cursor: "pointer",
        fontSize: 13,
        color: isActive ? "var(--accent-indigo)" : "var(--text-primary)",
        width: "100%",
        textAlign: "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const DIVIDER = (
  <div
    style={{
      width: 1,
      height: 18,
      background: "var(--border-primary)",
      margin: "0 4px",
      flexShrink: 0,
    }}
  />
);

export function FormatToolbar({ editor }: FormatToolbarProps) {
  const [openDropdown, setOpenDropdown] = useState<"heading" | "list" | null>(
    null
  );
  const toolbarRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold"),
      isItalic: ctx.editor.isActive("italic"),
      isHighlight: ctx.editor.isActive("highlight"),
      isTaskList: ctx.editor.isActive("taskList"),
      isBulletList: ctx.editor.isActive("bulletList"),
      isOrderedList: ctx.editor.isActive("orderedList"),
      headingLevel:
        [1, 2, 3].find((l) =>
          ctx.editor.isActive("heading", { level: l })
        ) ?? 0,
    }),
  });

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

  const headingLabel =
    state.headingLevel > 0 ? `H${state.headingLevel}` : "Text";
  const isListActive = state.isBulletList || state.isOrderedList;

  return (
    <div
      ref={toolbarRef}
      style={{
        height: 40,
        background: "var(--bg-format-bar)",
        borderRadius: 10,
        display: "flex",
        alignItems: "center",
        padding: "0 8px",
        gap: 2,
        userSelect: "none",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--bg-format-bar-border)",
        boxShadow: "var(--shadow-format)",
      }}
    >
      {/* Heading dropdown */}
      <div style={{ position: "relative" }}>
        <ToolButton
          isActive={state.headingLevel > 0}
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
              isActive={state.headingLevel === 0}
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
                isActive={state.headingLevel === level}
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
                <span style={{ fontSize: 12, color: "var(--text-icon)" }}>
                  Heading {level}
                </span>
              </DropdownItem>
            ))}
          </div>
        )}
      </div>

      {DIVIDER}

      <ToolButton
        isActive={state.isTaskList}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >
        <SquareCheck size={15} />
      </ToolButton>

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
              isActive={state.isBulletList}
              onClick={() => {
                editor.chain().focus().toggleBulletList().run();
                setOpenDropdown(null);
              }}
            >
              <List size={14} />
              <span>Bullet list</span>
            </DropdownItem>
            <DropdownItem
              isActive={state.isOrderedList}
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

      <ToolButton
        isActive={state.isBold}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={15} />
      </ToolButton>

      <ToolButton
        isActive={state.isItalic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={15} />
      </ToolButton>

      {DIVIDER}

      <ToolButton
        isActive={state.isHighlight}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        <Highlighter size={15} />
      </ToolButton>

      <ToolButton
        onClick={() => {
          const prev = editor.getAttributes("link").href;
          const url = window.prompt("URL", prev);
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
          } else {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }
        }}
        title="Link"
      >
        <LinkIcon size={15} />
      </ToolButton>

      {DIVIDER}

      <ToolButton
        onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        title="Insert table"
      >
        <Table size={15} />
      </ToolButton>

      <ToolButton onClick={() => imageInputRef.current?.click()} title="Insert image">
        <Image size={15} />
      </ToolButton>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            editor.chain().focus().setImage({ src: reader.result as string }).run();
          };
          reader.readAsDataURL(file);
          e.target.value = "";
        }}
      />

      {DIVIDER}

      <ToolButton onClick={() => {}} title="More options">
        <MoreHorizontal size={15} />
      </ToolButton>
    </div>
  );
}
