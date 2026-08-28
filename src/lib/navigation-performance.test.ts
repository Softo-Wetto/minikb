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
