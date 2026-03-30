import { useState, useEffect, useRef, useCallback } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChevronDown, SquarePen, Search, X, Plus, Trash2, AlertTriangle, Moon, Sun, Globe, Settings, Check, Download, RefreshCw, Loader2, CircleCheck } from "lucide-react";
import { onUpdateStatus, checkForUpdates, installUpdate, type UpdateStatus } from "../../lib/updater";
import { AppIcon, ICON_COLORS } from "../AppIcon";
import type { Folder as FolderType } from "../../lib/db";
import { TRASH_FOLDER_ID } from "../../lib/db";
import { getFolderIcon, FOLDER_ICONS } from "../../lib/folderIcons";
import type { Theme } from "../../lib/theme";

const win = getCurrentWindow();

// Segoe MDL2 Assets — Windows native titlebar glyphs
const MDL2 = {
  minimize: "\uE921",
  maximize: "\uE922",
  restore: "\uE923",
  close: "\uE8BB",
};

const mdl2Style: React.CSSProperties = {
  fontFamily: "'Segoe MDL2 Assets'",
  fontSize: "10px",
  lineHeight: 1,
};

interface TitleBarProps {
  maximized: boolean;
  noteTitle?: string;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  folders: FolderType[];
  currentFolderId: string;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (name: string, icon: string) => void;
  onDeleteFolder: (id: string) => void;
  onGetFolderNoteCount: (id: string) => Promise<number>;
  onUpdateFolderIcon: (id: string, icon: string) => void;
  onNewNote: () => void;
  onToggleSearch: (global?: boolean) => void;
  onCloseSearch: () => void;
  searchOpen: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  globalSearch: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  onMoveNoteToFolder: (noteId: string, folderId: string) => void;
  isTrash: boolean;
  editorTyping: boolean;
  iconColor: string;
  onIconColorChange: (color: string) => void;
}

export function TitleBar({
  maximized,
  noteTitle: _,
  sidebarWidth,
  sidebarCollapsed,
  folders,
  currentFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onGetFolderNoteCount,
  onUpdateFolderIcon,
  onNewNote,
  onToggleSearch,
  onCloseSearch,
  searchOpen,
  searchQuery,
  onSearchChange,
  globalSearch,
  theme,
  onToggleTheme,
  onMoveNoteToFolder,
  isTrash,
  editorTyping,
  iconColor,
  onIconColorChange,
}: TitleBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("folder");
  const [editingIconForId, setEditingIconForId] = useState<string | null>(null);
  const [iconPopoverPos, setIconPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; noteCount: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const iconPopoverRef = useRef<HTMLDivElement>(null);
  const folderBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = isTrash
    ? { id: TRASH_FOLDER_ID, name: "Trash", icon: "trash" }
    : folders.find((f) => f.id === currentFolderId);
  const currentFolderName = currentFolder?.name ?? "Notes";
  const CurrentFolderIcon = isTrash ? Trash2 : getFolderIcon(currentFolder?.icon).Icon;

  const isLastFolder = folders.length <= 1;

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: Event) => {
      if (folderBtnRef.current?.contains(e.target as Node)) return;
      if (iconPopoverRef.current?.contains(e.target as Node)) return;
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPopoverOpen(false);
        setCreatingFolder(false);
        setNewFolderName("");
        setNewFolderIcon("folder");
        setEditingIconForId(null);
        setIconPopoverPos(null);
      }
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [popoverOpen]);

  // Auto-focus input when creating
  useEffect(() => {
    if (creatingFolder) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [creatingFolder]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [searchOpen]);

  // Open folder popover when dragging a note over the folder button
  const [dragOverFolder, setDragOverFolder] = useState(false);
  useEffect(() => {
    if (dragOverFolder && !popoverOpen) {
      const timer = setTimeout(() => setPopoverOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, [dragOverFolder, popoverOpen]);

  const handleRequestDelete = useCallback(async (folder: FolderType) => {
    const noteCount = await onGetFolderNoteCount(folder.id);
    setDeleteConfirm({ id: folder.id, name: folder.name, noteCount });
  }, [onGetFolderNoteCount]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteConfirm) return;
    onDeleteFolder(deleteConfirm.id);
    setDeleteConfirm(null);
    setPopoverOpen(false);
  }, [deleteConfirm, onDeleteFolder]);

  const handleCreateFolder = () => {
    const name = newFolderName.trim();
    if (name) {
      onCreateFolder(name, newFolderIcon);
      setNewFolderName("");
      setNewFolderIcon("folder");
      setCreatingFolder(false);
      setPopoverOpen(false);
    }
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        height: "52px",
        flexShrink: 0,
        background: "var(--bg-primary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      {/* Vertical divider — continuous with sidebar border */}
      {!sidebarCollapsed && (
        <div
          style={{
            position: "absolute",
            left: sidebarWidth - 1,
            top: 0,
            bottom: 0,
            width: 1,
            background: "var(--border-primary)",
            zIndex: 1,
          }}
        />
      )}

      {/* Left section: folder picker + compose/search buttons */}
      <div
        style={{
          width: sidebarCollapsed ? "auto" : sidebarWidth,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
      {/* Folder switcher (collapses) */}
      <div
        data-tauri-drag-region
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          maxWidth: sidebarCollapsed ? 0 : "none",
          opacity: sidebarCollapsed ? 0 : 1,
          padding: sidebarCollapsed ? 0 : "0 0 0 20px",
          transition: "max-width 0.2s ease, opacity 0.15s ease, padding 0.2s ease",
          pointerEvents: sidebarCollapsed ? "none" : "auto",
        }}
      >
          <div className="titlebar-swap" style={{ flex: 1, minWidth: 0 }}>
            {/* Folder name + chevron */}
            <div className={`titlebar-folder${searchOpen ? " hidden" : ""}`} style={{ display: "flex", alignItems: "center", minWidth: 0 }}>
              <div style={{ position: "relative", minWidth: 0 }}>
                <button
                  ref={folderBtnRef}
                  onClick={() => setPopoverOpen((p) => !p)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverFolder(true); }}
                  onDragLeave={() => setDragOverFolder(false)}
                  onDrop={() => setDragOverFolder(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "4px 2px",
                    borderRadius: 6,
                    fontSize: "19px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    letterSpacing: -0.4,
                    fontFamily: "inherit",
                    transition: "background 0.1s",
                    maxWidth: "100%",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <CurrentFolderIcon size={18} strokeWidth={1.5} style={{ flexShrink: 0, marginRight: 4, opacity: 0.5 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentFolderName}</span>
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    style={{
                      color: "var(--text-icon)",
                      marginTop: 1,
                      flexShrink: 0,
                      transform: popoverOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.15s",
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Search input */}
            <div className={`titlebar-search${searchOpen ? "" : " hidden"}`} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", flex: 1 }}>
                {globalSearch ? (
                  <Globe
                    size={13}
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--accent-blue)",
                      pointerEvents: "none",
                    }}
                  />
                ) : (
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: 9,
                      top: "50%",
                      transform: "translateY(-50%)",
                      color: "var(--text-muted)",
                      pointerEvents: "none",
                    }}
                  />
                )}
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={globalSearch ? "Search all folders" : "Search"}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") onCloseSearch();
                  }}
                  className="sidebar-search"
                  style={{
                    width: "100%",
                    padding: "7px 30px 7px 28px",
                    fontSize: 14,
                    borderRadius: 8,
                    border: `1px solid var(--border-input)`,
                    background: "var(--bg-input)",
                    outline: "none",
                    fontFamily: "inherit",
                    fontWeight: 550,
                    color: "var(--text-primary)",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={onCloseSearch}
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 20,
                    height: 20,
                    border: "none",
                    background: "transparent",
                    borderRadius: 4,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-icon-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; }}
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Compose + Search — always visible */}
      <div style={{ display: "flex", gap: "2px", marginLeft: sidebarCollapsed ? 16 : 8, flexShrink: 0, transition: "margin 0.2s ease" }}>
        {!isTrash && (
          <div
            style={{
              width: searchOpen ? 0 : 32,
              opacity: searchOpen ? 0 : 1,
              overflow: "hidden",
              flexShrink: 0,
              transition: "width 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease",
            }}
          >
            <SidebarButton onClick={onNewNote} label="New note">
              <SquarePen size={18} strokeWidth={1.5} />
            </SidebarButton>
          </div>
        )}
        {!sidebarCollapsed && (
          <SidebarButton onClick={() => onToggleSearch()} label="Search" isActive={searchOpen}>
            <Search size={18} strokeWidth={1.5} />
          </SidebarButton>
        )}
      </div>
      </div>

      {/* Folder popover */}
      {popoverOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 20,
            background: "var(--bg-popover)",
            border: "1px solid var(--border-light)",
            borderRadius: 10,
            boxShadow: "var(--shadow-popover)",
            padding: 4,
            zIndex: 1000,
            minWidth: 200,
          }}
        >
          {folders.map((folder) => {
            const isActive = folder.id === currentFolderId;
            const canDelete = !isLastFolder;
            const FolderIconComp = getFolderIcon(folder.icon).Icon;
            const isEditingIcon = editingIconForId === folder.id;

            return (
              <div key={folder.id}>
                <FolderItem
                  folderId={folder.id}
                  name={folder.name}
                  isActive={isActive}
                  icon={<FolderIconComp size={15} strokeWidth={1.5} />}
                  onIconClick={(e) => {
                    e.stopPropagation();
                    if (isEditingIcon) {
                      setEditingIconForId(null);
                      setIconPopoverPos(null);
                    } else {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setEditingIconForId(folder.id);
                      setIconPopoverPos({ top: rect.top, left: rect.right + 6 });
                    }
                  }}
                  onDelete={canDelete ? () => {
                    handleRequestDelete(folder);
                  } : undefined}
                  onClick={() => {
                    onSelectFolder(folder.id);
                    setPopoverOpen(false);
                    setCreatingFolder(false);
                    setEditingIconForId(null);
                    setIconPopoverPos(null);
                  }}
                  onMoveNoteToFolder={onMoveNoteToFolder}
                />
              </div>
            );
          })}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border-light)", margin: "4px 0" }} />

          {/* Trash folder */}
          <FolderItem
            folderId={TRASH_FOLDER_ID}
            name="Trash"
            isActive={currentFolderId === TRASH_FOLDER_ID}
            icon={<Trash2 size={15} strokeWidth={1.5} />}
            onClick={() => {
              onSelectFolder(TRASH_FOLDER_ID);
              setPopoverOpen(false);
            }}
            onMoveNoteToFolder={onMoveNoteToFolder}
          />

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border-light)", margin: "4px 0" }} />

          {/* New folder */}
          {creatingFolder ? (
            <div style={{ padding: "4px 6px" }}>
              <IconGrid
                selectedIcon={newFolderIcon}
                onSelect={setNewFolderIcon}
              />
              <input
                ref={inputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateFolder();
                  if (e.key === "Escape") {
                    setCreatingFolder(false);
                    setNewFolderName("");
                    setNewFolderIcon("folder");
                  }
                }}
                placeholder="Folder name"
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  fontSize: 13,
                  border: "1px solid var(--border-input)",
                  borderRadius: 6,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginTop: 6,
                  background: "var(--bg-input)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          ) : (
            <FolderItem
              folderId=""
              name="New Folder"
              icon={<Plus size={14} strokeWidth={1.5} />}
              onClick={() => setCreatingFolder(true)}
            />
          )}
        </div>
      )}

      {/* Icon picker popover — floats beside the folder menu */}
      {editingIconForId && iconPopoverPos && (() => {
        const folder = folders.find((f) => f.id === editingIconForId);
        if (!folder) return null;
        return (
          <div
            ref={iconPopoverRef}
            style={{
              position: "fixed",
              top: iconPopoverPos.top,
              left: iconPopoverPos.left,
              background: "var(--bg-popover)",
              border: "1px solid var(--border-light)",
              borderRadius: 10,
              boxShadow: "var(--shadow-popover)",
              padding: 6,
              zIndex: 1001,
              width: 170,
            }}
          >
            <IconGrid
              selectedIcon={folder.icon}
              onSelect={(icon) => {
                onUpdateFolderIcon(folder.id, icon);
                setEditingIconForId(null);
                setIconPopoverPos(null);
              }}
            />
          </div>
        );
      })()}

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "var(--overlay-bg)",
              zIndex: 2000,
            }}
            onClick={() => setDeleteConfirm(null)}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background: "var(--bg-popover)",
              borderRadius: 12,
              boxShadow: "var(--shadow-dialog)",
              padding: "24px",
              zIndex: 2001,
              width: 340,
              fontFamily: "inherit",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: "var(--accent-red-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <AlertTriangle size={18} strokeWidth={1.5} style={{ color: "var(--accent-red)" }} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  Delete "{deleteConfirm.name}"?
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {deleteConfirm.noteCount === 0
                    ? "This folder is empty. It will be permanently deleted."
                    : `This will permanently delete ${deleteConfirm.noteCount} note${deleteConfirm.noteCount === 1 ? "" : "s"} in this folder. This cannot be undone.`}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button
                onClick={() => setDeleteConfirm(null)}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "1px solid var(--border-input)",
                  background: "var(--bg-popover)",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  color: "var(--text-primary)",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-popover)"; }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  padding: "7px 16px",
                  fontSize: 13,
                  fontWeight: 500,
                  border: "none",
                  background: "var(--accent-red-strong)",
                  color: "#ffffff",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.1s",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Spacer */}
      <div data-tauri-drag-region style={{ flex: 1 }} />

      {/* Right: settings + window controls */}
      <div style={{ display: "flex", alignItems: "center" }}>
        <SettingsMenu theme={theme} onToggleTheme={onToggleTheme} faded={editorTyping} iconColor={iconColor} onIconColorChange={onIconColorChange} />

        <div style={{ width: 4 }} />

        <WindowButton
          onClick={() => win.minimize()}
          label="Minimize"
        >
          <span style={mdl2Style}>{MDL2.minimize}</span>
        </WindowButton>
        <WindowButton
          onClick={() => win.toggleMaximize()}
          label={maximized ? "Restore" : "Maximize"}
        >
          <span style={mdl2Style}>
            {maximized ? MDL2.restore : MDL2.maximize}
          </span>
        </WindowButton>
        <WindowButton
          onClick={() => win.close()}
          label="Close"
          isClose
        >
          <span style={mdl2Style}>{MDL2.close}</span>
        </WindowButton>
      </div>
    </div>
  );
}

function SettingsMenu({ theme, onToggleTheme, faded, iconColor, onIconColorChange }: { theme: Theme; onToggleTheme: () => void; faded?: boolean; iconColor: string; onIconColorChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: "idle" });

  useEffect(() => onUpdateStatus(setUpdateStatus), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (btnRef.current?.contains(e.target as Node)) return;
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  return (
    <div style={{ position: "relative", opacity: faded && !open ? 0 : 1, transition: "opacity 0.2s ease", pointerEvents: faded && !open ? "none" : "auto" }}>
      <button
        ref={btnRef}
        onClick={() => setOpen((p) => !p)}
        aria-label="Settings"
        style={{
          width: 32,
          height: 32,
          border: "none",
          background: "transparent",
          borderRadius: 7,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: open ? "var(--text-icon-hover)" : "var(--text-icon)",
          transition: "background 0.1s, color 0.1s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--bg-hover-strong)";
          e.currentTarget.style.color = "var(--text-icon-hover)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = open ? "var(--text-icon-hover)" : "var(--text-icon)";
        }}
      >
        <Settings size={16} strokeWidth={1.5} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            background: "var(--bg-popover)",
            border: "1px solid var(--border-light)",
            borderRadius: 10,
            boxShadow: "var(--shadow-popover)",
            padding: 4,
            zIndex: 1000,
            minWidth: 180,
          }}
        >
          {/* Icon preview */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 10px 8px" }}>
            <AppIcon color={iconColor} size={64} />
          </div>

          {/* Color swatches */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, padding: "4px 10px 10px", justifyContent: "center" }}>
            {ICON_COLORS.map((c) => (
              <button
                key={c.id}
                title={c.label}
                onClick={() => onIconColorChange(c.hex)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: iconColor === c.hex ? "2px solid var(--text-primary)" : "2px solid transparent",
                  background: c.hex,
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "border-color 0.1s, transform 0.1s",
                }}
              >
                {iconColor === c.hex && <Check size={12} strokeWidth={2.5} color="white" />}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: "var(--border-light)", margin: "0 6px 4px" }} />

          {/* Theme row */}
          <SettingsRow
            label="Theme"
            icon={theme === "light" ? <Sun size={14} strokeWidth={1.5} /> : <Moon size={14} strokeWidth={1.5} />}
            action={
              <button
                onMouseDown={(e) => { e.preventDefault(); onToggleTheme(); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  border: "none",
                  background: "var(--bg-active)",
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 12,
                  fontWeight: 550,
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-hover-strong)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "var(--bg-active)"; }}
              >
                {theme === "light" ? "Light" : "Dark"}
                <ChevronDown size={11} style={{ opacity: 0.5, transform: "rotate(-90deg)" }} />
              </button>
            }
          />

          <div style={{ height: 1, background: "var(--border-light)", margin: "4px 6px" }} />

          {/* Update row */}
          <UpdateRow status={updateStatus} />
        </div>
      )}
    </div>
  );
}

function UpdateRow({ status }: { status: UpdateStatus }) {
  if (status.state === "downloading") {
    return (
      <SettingsRow
        label={`Updating... ${status.progress}%`}
        icon={<Loader2 size={14} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite" }} />}
        action={
          <div style={{
            width: 60,
            height: 4,
            borderRadius: 2,
            background: "var(--bg-active)",
            overflow: "hidden",
          }}>
            <div style={{
              width: `${status.progress}%`,
              height: "100%",
              background: "var(--accent-blue)",
              borderRadius: 2,
              transition: "width 0.2s ease",
            }} />
          </div>
        }
      />
    );
  }

  if (status.state === "ready") {
    return (
      <SettingsRow
        label="Restart to finish update"
        icon={<CircleCheck size={14} strokeWidth={1.5} style={{ color: "var(--accent-blue)" }} />}
        action={null}
      />
    );
  }

  if (status.state === "available") {
    return (
      <SettingsRow
        label={`v${status.version} available`}
        icon={<Download size={14} strokeWidth={1.5} style={{ color: "var(--accent-blue)" }} />}
        action={
          <SettingsButton label="Install" onClick={installUpdate} />
        }
      />
    );
  }

  if (status.state === "up-to-date") {
    return (
      <SettingsRow
        label="Up to date"
        icon={<CircleCheck size={14} strokeWidth={1.5} style={{ color: "var(--accent-blue)" }} />}
        action={null}
      />
    );
  }

  if (status.state === "error") {
    return (
      <SettingsRow
        label="Update failed"
        icon={<AlertTriangle size={14} strokeWidth={1.5} style={{ color: "var(--accent-red)" }} />}
        action={
          <SettingsButton label="Retry" onClick={checkForUpdates} />
        }
      />
    );
  }

  // idle or checking
  return (
    <SettingsRow
      label="Updates"
      icon={<RefreshCw size={14} strokeWidth={1.5} style={status.state === "checking" ? { animation: "spin 1s linear infinite" } : undefined} />}
      action={
        <SettingsButton
          label={status.state === "checking" ? "Checking..." : "Check"}
          onClick={status.state === "checking" ? undefined : checkForUpdates}
        />
      }
    />
  );
}

function SettingsButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        border: "none",
        background: "var(--bg-active)",
        borderRadius: 6,
        padding: "3px 10px",
        fontSize: 12,
        fontWeight: 550,
        color: "var(--text-primary)",
        cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit",
        transition: "background 0.1s",
        opacity: onClick ? 1 : 0.6,
      }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "var(--bg-hover-strong)"; }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.background = "var(--bg-active)"; }}
    >
      {label}
    </button>
  );
}

function SettingsRow({ label, icon, action }: { label: string; icon: React.ReactNode; action: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        borderRadius: 6,
        minHeight: 32,
      }}
    >
      <span style={{ color: "var(--text-icon)", display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{label}</span>
      {action}
    </div>
  );
}

function IconGrid({
  selectedIcon,
  onSelect,
}: {
  selectedIcon: string;
  onSelect: (icon: string) => void;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 2,
        padding: 2,
      }}
    >
      {FOLDER_ICONS.map(({ id, label, Icon }) => {
        const isSelected = id === selectedIcon;
        return (
          <button
            key={id}
            title={label}
            onClick={() => onSelect(id)}
            style={{
              width: 30,
              height: 30,
              border: "none",
              background: isSelected ? "var(--bg-active)" : "transparent",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
              transition: "background 0.1s, color 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-icon-hover)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            <Icon size={16} strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}

function FolderItem({
  folderId,
  name,
  isActive,
  icon,
  onIconClick,
  onDelete,
  onClick,
  onMoveNoteToFolder,
}: {
  folderId: string;
  name: string;
  isActive?: boolean;
  icon?: React.ReactNode;
  onIconClick?: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  onClick: () => void;
  onMoveNoteToFolder?: (noteId: string, folderId: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const DefaultIcon = getFolderIcon("folder").Icon;

  const handleDragOver = (e: React.DragEvent) => {
    if (!onMoveNoteToFolder || !folderId) return;
    const noteId = e.dataTransfer.types.includes("application/note-id");
    if (!noteId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    setDragOver(false);
    if (!onMoveNoteToFolder || !folderId) return;
    const noteId = e.dataTransfer.getData("application/note-id");
    if (noteId) {
      onMoveNoteToFolder(noteId, folderId);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="folder-drop-target"
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 6,
        transition: "background 0.1s",
        background: dragOver
          ? "var(--accent-blue-tint)"
          : isActive
          ? "var(--bg-hover-strong)"
          : hovered
          ? "var(--bg-hover)"
          : "transparent",
        outline: dragOver ? "2px solid var(--accent-blue)" : "none",
        outlineOffset: -2,
      }}
    >
      {/* Icon — clickable to edit */}
      <button
        onClick={onIconClick ?? onClick}
        style={{
          flexShrink: 0,
          width: 28,
          height: 32,
          border: "none",
          background: "transparent",
          cursor: onIconClick ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-icon)",
          borderRadius: 6,
          padding: 0,
          transition: "color 0.1s",
        }}
        onMouseEnter={(e) => { if (onIconClick) e.currentTarget.style.color = "var(--text-icon-hover)"; }}
        onMouseLeave={(e) => { if (onIconClick) e.currentTarget.style.color = "var(--text-icon)"; }}
        title={onIconClick ? "Change icon" : undefined}
      >
        {icon ?? <DefaultIcon size={15} strokeWidth={1.5} />}
      </button>

      {/* Name — click to select folder */}
      <button
        onClick={onClick}
        style={{
          flex: 1,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: "7px 4px",
          fontSize: 14,
          fontWeight: isActive ? 600 : 500,
          color: "var(--text-primary)",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        {name}
      </button>

      {/* Delete button — only on hover for non-default folders */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Delete folder"
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            border: "none",
            background: "transparent",
            borderRadius: 5,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.1s, color 0.1s, background 0.1s",
            padding: 0,
            marginRight: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent-red)";
            e.currentTarget.style.background = "var(--accent-red-tint)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Trash2 size={13} strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

function SidebarButton({
  onClick,
  label,
  children,
  isActive,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        border: "none",
        background: "transparent",
        borderRadius: 7,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isActive ? "var(--text-icon-hover)" : "var(--text-icon)",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover-strong)";
        e.currentTarget.style.color = "var(--text-icon-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = isActive ? "var(--text-icon-hover)" : "var(--text-icon)";
      }}
    >
      {children}
    </button>
  );
}

function WindowButton({
  onClick,
  label,
  children,
  isClose,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  isClose?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: isClose ? "54px" : "44px",
        height: "52px",
        border: "none",
        background: "transparent",
        cursor: "default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--text-icon)",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (isClose) {
          e.currentTarget.style.background = "rgba(196, 43, 28, 0.88)";
          e.currentTarget.style.color = "white";
        } else {
          e.currentTarget.style.background = "var(--bg-active)";
          e.currentTarget.style.color = "var(--text-icon-hover)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-icon)";
      }}
    >
      {children}
    </button>
  );
}
