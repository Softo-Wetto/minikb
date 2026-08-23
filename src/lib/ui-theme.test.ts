import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("loads the compact workspace font and root theme hook", () => {
  const layout = source("../app/layout.tsx");

  assert.match(layout, /import \{ Geist \} from "next\/font\/google"/);
  assert.match(layout, /variable: "--font-sans"/);
  assert.match(layout, /className="minikb-root/);
});

test("defines high-contrast workspace surfaces and readable secondary text", () => {
  const css = source("../app/globals.css");

  assert.match(css, /--kb-canvas:\s*#080a0f/);
  assert.match(css, /--kb-text-secondary:\s*#b8c0cc/);
  assert.match(css, /\.minikb-workspace\s*\{/);
  assert.match(css, /\.minikb-main\s*\{/);
  assert.match(css, /\.surface-panel\s*\{/);
});

test("applies shared polish hooks to navigation, tables, and collection pages", () => {
  const shell = source("../components/app-shell.tsx");
  const header = source("../components/app-header.tsx");
  const sidebar = source("../components/app-sidebar.tsx");
  const table = source("../components/article-table.tsx");
  const assets = source("../app/assets/page.tsx");
  const companies = source("../app/companies/page.tsx");

  assert.match(shell, /minikb-workspace/);
  assert.match(shell, /minikb-main/);
  assert.match(header, /minikb-header/);
  assert.match(sidebar, /minikb-client-sidebar/);
  assert.match(table, /minikb-article-table/);
  assert.match(assets, /minikb-collection-page/);
  assert.match(companies, /minikb-collection-page/);
});

test("keeps hover utilities dormant until interaction", () => {
  const css = source("../app/workspace-polish.css");

  assert.doesNotMatch(css, /\[class\*="bg-slate-(?:900|950)"\]/);
  assert.doesNotMatch(css, /\[class\*="border-slate-(?:700|800)"\]/);
  assert.match(css, /\[class~="bg-slate-900"\]/);
  assert.match(css, /\.kb-interactive-row:hover/);
});

test("uses the client accent for sidebar hover and keyboard focus", () => {
  const css = source("../app/workspace-polish.css");
  const sidebar = source("../components/app-sidebar.tsx");

  assert.match(sidebar, /kb-interactive-row-client/);
  assert.match(css, /\.kb-interactive-row-client:hover/);
  assert.match(css, /\.minikb-root \.kb-interactive-row-client:focus-visible/);
  assert.match(css, /outline-color:\s*#7dd3fc/);
});
test("renders category article links as transparent interactive rows", () => {
  const css = source("../app/workspace-polish.css");
  const categories = source("../components/kb-category-list.tsx");

  assert.match(categories, /minikb-category-link kb-interactive-row/);
  assert.match(css, /\.minikb-category-link\s*\{[^}]*background:\s*transparent/s);
  assert.match(css, /\.minikb-category-link:hover\s*\{[^}]*border-color:/s);
});


test("keeps reduced-motion focus states and category icons still", () => {
  const css = source("../app/workspace-polish.css");
  const categories = source("../components/kb-category-list.tsx");

  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.kb-interactive-row:focus-visible[\s\S]*transform:\s*none !important/,
  );
  assert.doesNotMatch(categories, /group-hover:scale-/);
});

test("keeps static dashboard health cards stationary", () => {
  const dashboard = source("../components/dashboard-overview.tsx");


  assert.doesNotMatch(dashboard, /surface-card card-lift/);
});
