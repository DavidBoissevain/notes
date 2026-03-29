import {
  Folder,
  StickyNote,
  SquareCheckBig,
  Star,
  Heart,
  BookOpen,
  Briefcase,
  Code,
  Music,
  Camera,
  House,
  Zap,
  Palette,
  Globe,
  GraduationCap,
  Plane,
  Coffee,
  Leaf,
  Trophy,
  MessageCircle,
  Settings,
  Archive,
  type LucideIcon,
} from "lucide-react";

export interface FolderIcon {
  id: string;
  label: string;
  Icon: LucideIcon;
}

export const FOLDER_ICONS: FolderIcon[] = [
  { id: "folder", label: "Folder", Icon: Folder },
  { id: "note", label: "Note", Icon: StickyNote },
  { id: "todo", label: "Todo", Icon: SquareCheckBig },
  { id: "star", label: "Star", Icon: Star },
  { id: "heart", label: "Heart", Icon: Heart },
  { id: "book-open", label: "Book", Icon: BookOpen },
  { id: "briefcase", label: "Work", Icon: Briefcase },
  { id: "code", label: "Code", Icon: Code },
  { id: "music", label: "Music", Icon: Music },
  { id: "camera", label: "Camera", Icon: Camera },
  { id: "house", label: "Home", Icon: House },
  { id: "zap", label: "Lightning", Icon: Zap },
  { id: "palette", label: "Art", Icon: Palette },
  { id: "globe", label: "Globe", Icon: Globe },
  { id: "graduation-cap", label: "Education", Icon: GraduationCap },
  { id: "plane", label: "Travel", Icon: Plane },
  { id: "coffee", label: "Coffee", Icon: Coffee },
  { id: "leaf", label: "Nature", Icon: Leaf },
  { id: "trophy", label: "Goals", Icon: Trophy },
  { id: "message", label: "Chat", Icon: MessageCircle },
  { id: "settings", label: "Settings", Icon: Settings },
  { id: "archive", label: "Archive", Icon: Archive },
];

const iconMap = new Map(FOLDER_ICONS.map((i) => [i.id, i]));

export function getFolderIcon(id: string | null | undefined): FolderIcon {
  return iconMap.get(id ?? "folder") ?? FOLDER_ICONS[0];
}
