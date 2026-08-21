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
