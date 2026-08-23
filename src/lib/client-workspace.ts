export type ClientView = "overview" | "articles" | "assets";

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
