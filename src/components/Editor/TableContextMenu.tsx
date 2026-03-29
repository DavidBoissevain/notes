import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from "lucide-react";

interface TableContextMenuProps {
  editor: Editor;
  x: number;
  y: number;
  onClose: () => void;
}

function MenuItem({
  onClick,
  children,
  destructive,
}: {
  onClick: () => void;
  children: React.ReactNode;
  destructive?: boolean;
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
        background: hovered
          ? destructive
            ? "var(--accent-red-tint)"
            : "var(--bg-hover-strong)"
          : "transparent",
        cursor: "pointer",
        fontSize: 13,
        color: destructive ? "var(--accent-red)" : "var(--text-primary)",
        width: "100%",
        textAlign: "left",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

export function TableContextMenu({ editor, x, y, onClose }: TableContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const run = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 1000,
        background: "var(--bg-popover)",
        border: "1px solid var(--border-light)",
        borderRadius: 8,
        boxShadow: "var(--shadow-menu)",
        padding: 4,
        minWidth: 160,
      }}
    >
      <MenuItem onClick={() => run(() => editor.chain().focus().addRowBefore().run())}>
        <ArrowUp size={13} /> Add row above
      </MenuItem>
      <MenuItem onClick={() => run(() => editor.chain().focus().addRowAfter().run())}>
        <ArrowDown size={13} /> Add row below
      </MenuItem>
      <div style={{ height: 1, background: "var(--border-light)", margin: "3px 6px" }} />
      <MenuItem onClick={() => run(() => editor.chain().focus().addColumnBefore().run())}>
        <ArrowLeft size={13} /> Add column before
      </MenuItem>
      <MenuItem onClick={() => run(() => editor.chain().focus().addColumnAfter().run())}>
        <ArrowRight size={13} /> Add column after
      </MenuItem>
      <div style={{ height: 1, background: "var(--border-light)", margin: "3px 6px" }} />
      <MenuItem destructive onClick={() => run(() => editor.chain().focus().deleteRow().run())}>
        <Trash2 size={13} /> Delete row
      </MenuItem>
      <MenuItem destructive onClick={() => run(() => editor.chain().focus().deleteColumn().run())}>
        <Trash2 size={13} /> Delete column
      </MenuItem>
      <MenuItem destructive onClick={() => run(() => editor.chain().focus().deleteTable().run())}>
        <Trash2 size={13} /> Delete table
      </MenuItem>
    </div>
  );
}
