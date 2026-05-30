export type AppRole = "admin" | "editor" | "viewer";

export function isAdmin(role?: string | null): role is "admin" {
  return role === "admin";
}

export function canEdit(role?: string | null): boolean {
  return role === "admin" || role === "editor";
}

export function canView(role?: string | null): boolean {
  return role === "admin" || role === "editor" || role === "viewer";
}

export function roleLabel(role?: string | null): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "editor":
      return "Editor";
    case "viewer":
      return "Viewer";
    default:
      return "Unknown";
  }
}