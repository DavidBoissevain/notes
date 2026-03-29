export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 30) return "Just now";
  if (seconds < 90) return "A minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  if (hours < 2) return "An hour ago";
  if (hours < 24) return `${hours} hours ago`;
  if (hours < 36) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  const date = new Date(timestamp);
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();
  const year = date.getFullYear();
  const currentYear = new Date().getFullYear();

  if (year === currentYear) return `${month} ${day}`;
  return `${month} ${day}, ${year}`;
}
