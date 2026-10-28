export type ClientView = "overview" | "articles" | "assets";

export type WorkspaceRecordRoute = {
  collection: "articles" | "assets" | "companies";
  id: string;
};

export function parseWorkspaceRecordRoute(pathname: string): WorkspaceRecordRoute | null {
  const match = pathname.match(/^\/(articles|assets|companies)\/([^/]+)(?:\/edit)?\/?$/);
  if (!match) return null;

  try {
    const collection = match[1] as WorkspaceRecordRoute["collection"];
    const id = decodeURIComponent(match[2]);
    if (
      !id.trim() || id.includes("/") || id.includes("\\") || id.includes("?") || id.includes("#") ||
      Array.from(id).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127) ||
      id === "new" ||
      (collection === "articles" && ["favorites", "folders", "templates"].includes(id))
    ) return null;

    return { collection, id };
  } catch {
    return null;
  }
}

export function normalizeClientView(value?: string | null): ClientView {
  return value === "articles" || value === "assets" ? value : "overview";
}

export function companyWorkspaceHref(
  clientId: string,
  view: ClientView,
  page?: number,
) {
  const base = `/companies/${encodeURIComponent(clientId)}`;
  const query = new URLSearchParams();

  if (view !== "overview") query.set("view", view);
  if (page && Number.isFinite(page) && page > 1) {
    query.set("page", String(Math.floor(page)));
  }

  const search = query.toString();
  return search ? `${base}?${search}` : base;
}
