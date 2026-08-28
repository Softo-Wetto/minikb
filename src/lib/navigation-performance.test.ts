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
