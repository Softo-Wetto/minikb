import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

test("deduplicates authenticated user reads within one server render", () => {
  const server = source("./pocketbase/server.ts");

  assert.match(server, /import \{ cache \} from "react"/);
  assert.match(server, /export const getServerAuth = cache\(/);
  assert.match(server, /export const getServerUser = cache\(/);
  assert.match(server, /api\/collections\/users\/records/);
});

test("loads independent collection page data concurrently", () => {
  for (const path of [
    "../app/page.tsx",
    "../app/articles/page.tsx",
    "../app/assets/page.tsx",
    "../app/companies/page.tsx",
    "./article-folders.ts",
  ]) {
    assert.match(source(path), /Promise\.all(?:Settled)?\(/, path);
  }
});

test("loads independent detail and editor data concurrently", () => {
  for (const path of [
    "../app/articles/[id]/page.tsx",
    "../app/articles/new/page.tsx",
    "../app/articles/[id]/edit/page.tsx",
    "../app/assets/[id]/page.tsx",
    "../app/assets/[id]/edit/page.tsx",
    "../app/companies/[id]/page.tsx",
  ]) {
    assert.match(source(path), /Promise\.all(?:Settled)?\(/, path);
  }
});

test("keeps article editor folder failures fatal", () => {
  const articleEdit = source("../app/articles/[id]/edit/page.tsx");

  assert.match(
    articleEdit,
    /if \(folderOptionsResult\.status === "rejected"\) \{\s*throw folderOptionsResult\.reason;\s*\}/,
  );
});
