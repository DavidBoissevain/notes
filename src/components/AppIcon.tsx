export const ICON_COLORS = [
  { id: "steel",    label: "Steel",    hex: "#4A6FA5" },
  { id: "slate",    label: "Slate",    hex: "#64748B" },
  { id: "red",      label: "Red",      hex: "#E04040" },
  { id: "rose",     label: "Rose",     hex: "#E85A8A" },
  { id: "orange",   label: "Orange",   hex: "#E8793A" },
  { id: "amber",    label: "Amber",    hex: "#D4960A" },
  { id: "green",    label: "Green",    hex: "#3BA55C" },
  { id: "teal",     label: "Teal",     hex: "#14A89A" },
  { id: "blue",     label: "Blue",     hex: "#3A82F7" },
  { id: "purple",   label: "Purple",   hex: "#7C5CDB" },
] as const;

export const DEFAULT_ICON_COLOR = "#4A6FA5";

export function AppIcon({ color = DEFAULT_ICON_COLOR, size = 32 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="112" fill={color} />
      {/* Page with folded corner */}
      <path fill="white" d="M145 90 L330 90 L385 145 L385 422 C385 430 379 436 371 436 L145 436 C137 436 131 430 131 422 L131 104 C131 96 137 90 145 90Z" />
      <path fill={color} opacity="0.25" d="M330 90 L385 145 L330 145Z" />
      {/* Pencil */}
      <g transform="translate(256, 280) rotate(-45)">
        <rect x="-12" y="-120" width="24" height="190" rx="3" fill={color} />
        <polygon points="-12,70 12,70 0,95" fill={color} />
        <rect x="-12" y="-120" width="24" height="14" rx="2" fill={color} opacity="0.6" />
        <rect x="-10" y="-135" width="20" height="18" rx="4" fill="white" opacity="0.5" />
      </g>
    </svg>
  );
}
