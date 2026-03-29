import { useState, useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ChevronDown, SquarePen, Search, X, Plus, Trash2 } from "lucide-react";
import type { Folder as FolderType } from "../../lib/db";
import { getFolderIcon, FOLDER_ICONS } from "../../lib/folderIcons";

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
  onUpdateFolderIcon: (id: string, icon: string) => void;
  onNewNote: () => void;
  onToggleSearch: () => void;
  onCloseSearch: () => void;
  searchOpen: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
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
  onUpdateFolderIcon,
  onNewNote,
  onToggleSearch,
  onCloseSearch,
  searchOpen,
  searchQuery,
  onSearchChange,
}: TitleBarProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderIcon, setNewFolderIcon] = useState("folder");
  const [editingIconForId, setEditingIconForId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const folderBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = folders.find((f) => f.id === currentFolderId);
  const currentFolderName = currentFolder?.name ?? "Notes";
  const CurrentFolderIcon = getFolderIcon(currentFolder?.icon).Icon;

  const isLastFolder = folders.length <= 1;

  // Close popover on outside click
  useEffect(() => {
    if (!popoverOpen) return;
    const handler = (e: Event) => {
      if (folderBtnRef.current?.contains(e.target as Node)) return;
      if (!popoverRef.current?.contains(e.target as Node)) {
        setPopoverOpen(false);
        setCreatingFolder(false);
        setNewFolderName("");
        setNewFolderIcon("folder");
        setEditingIconForId(null);
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
        background: "#ffffff",
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
            background: "rgba(0, 0, 0, 0.16)",
            zIndex: 1,
          }}
        />
      )}

      {/* Left section: folder picker + compose/search buttons — fixed to sidebar width */}
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
                    color: "#1c1c1e",
                    letterSpacing: -0.4,
                    fontFamily: "inherit",
                    transition: "background 0.1s",
                    maxWidth: "100%",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <CurrentFolderIcon size={18} strokeWidth={1.5} style={{ flexShrink: 0, marginRight: 4, opacity: 0.5 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentFolderName}</span>
                  <ChevronDown
                    size={14}
                    strokeWidth={2}
                    style={{
                      color: "rgba(0,0,0,0.35)",
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
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 9,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(0,0,0,0.25)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search"
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
                    border: "1px solid rgba(0,0,0,0.08)",
                    background: "rgba(0,0,0,0.03)",
                    outline: "none",
                    fontFamily: "inherit",
                    fontWeight: 550,
                    color: "rgba(0,0,0,0.8)",
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
                    color: "rgba(0,0,0,0.3)",
                    padding: 0,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(0,0,0,0.6)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(0,0,0,0.3)"; }}
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Compose + Search — always visible, outside overflow:hidden */}
      <div style={{ display: "flex", gap: "2px", marginLeft: sidebarCollapsed ? 16 : 8, flexShrink: 0, transition: "margin 0.2s ease" }}>
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
        {!sidebarCollapsed && (
          <SidebarButton onClick={onToggleSearch} label="Search" isActive={searchOpen}>
            <Search size={18} strokeWidth={1.5} />
          </SidebarButton>
        )}
      </div>
      </div>

      {/* Folder popover — rendered at TitleBar root to escape overflow:hidden */}
      {popoverOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: "calc(100% + 2px)",
            left: 20,
            background: "#ffffff",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
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
                  name={folder.name}
                  isActive={isActive}
                  icon={<FolderIconComp size={15} strokeWidth={1.5} />}
                  onIconClick={(e) => {
                    e.stopPropagation();
                    setEditingIconForId(isEditingIcon ? null : folder.id);
                  }}
                  onDelete={canDelete ? () => {
                    onDeleteFolder(folder.id);
                    setPopoverOpen(false);
                  } : undefined}
                  onClick={() => {
                    onSelectFolder(folder.id);
                    setPopoverOpen(false);
                    setCreatingFolder(false);
                    setEditingIconForId(null);
                  }}
                />
                {isEditingIcon && (
                  <IconGrid
                    selectedIcon={folder.icon}
                    onSelect={(icon) => {
                      onUpdateFolderIcon(folder.id, icon);
                      setEditingIconForId(null);
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "4px 0" }} />

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
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 6,
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginTop: 6,
                }}
              />
            </div>
          ) : (
            <FolderItem
              name="New Folder"
              icon={<Plus size={14} strokeWidth={1.5} />}
              onClick={() => setCreatingFolder(true)}
            />
          )}
        </div>
      )}

      {/* Spacer */}
      <div data-tauri-drag-region style={{ flex: 1 }} />

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
              background: isSelected ? "rgba(0,0,0,0.08)" : "transparent",
              borderRadius: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isSelected ? "#1c1c1e" : "rgba(0,0,0,0.45)",
              transition: "background 0.1s, color 0.1s",
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                e.currentTarget.style.color = "rgba(0,0,0,0.7)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "rgba(0,0,0,0.45)";
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
  name,
  isActive,
  icon,
  onIconClick,
  onDelete,
  onClick,
}: {
  name: string;
  isActive?: boolean;
  icon?: React.ReactNode;
  onIconClick?: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const DefaultIcon = getFolderIcon("folder").Icon;
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 6,
        transition: "background 0.1s",
        background: isActive
          ? "rgba(0,0,0,0.05)"
          : hovered
          ? "rgba(0,0,0,0.03)"
          : "transparent",
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
          color: "rgba(0,0,0,0.4)",
          borderRadius: 6,
          padding: 0,
          transition: "color 0.1s",
        }}
        onMouseEnter={(e) => { if (onIconClick) e.currentTarget.style.color = "rgba(0,0,0,0.7)"; }}
        onMouseLeave={(e) => { if (onIconClick) e.currentTarget.style.color = "rgba(0,0,0,0.4)"; }}
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
          color: "#1c1c1e",
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
            color: "rgba(0,0,0,0.25)",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.1s, color 0.1s, background 0.1s",
            padding: 0,
            marginRight: 4,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(180,40,30,0.7)";
            e.currentTarget.style.background = "rgba(180,40,30,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(0,0,0,0.25)";
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
        color: isActive ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.4)",
        transition: "background 0.1s, color 0.1s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
        e.currentTarget.style.color = "rgba(0, 0, 0, 0.7)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = isActive ? "rgba(0, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.4)";
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
        height: "52px",
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
        e.currentTarget.style.color = hoverIconColor ?? "rgba(0, 0, 0, 0.7)";
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
