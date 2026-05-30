export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(dateString?: string | null): string {
  if (!dateString) return "Unknown date";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "Unknown date";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}