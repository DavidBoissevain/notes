import { useId } from "react";

// Same mark as app-icon.svg (the source for src-tauri/icons) and NotesMark on
// the website — keep all three in step.
export function AppIcon({ size = 32 }: { size?: number }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5B7BAA" />
          <stop offset="100%" stopColor="#3C5070" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <g
        transform="translate(4.8 4.8) scale(0.6)"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 3.75h16" />
        <path d="M4 9.25h16" />
        <path d="M4 14.75h16" />
        <path d="M4 20.25h9" />
      </g>
    </svg>
  );
}
