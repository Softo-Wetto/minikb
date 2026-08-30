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

test("preserves the app shell during optimized internal navigation", () => {
  const header = source("../components/app-header.tsx");
  const sidebar = source("../components/app-sidebar.tsx");

  assert.match(header, /useRouter/);
  assert.doesNotMatch(header, /window\.location\.href = "\/articles"/);
  assert.doesNotMatch(header, /window\.location\.href = `\/articles\?q=/);
  assert.match(
    sidebar,
    /const href = companyWorkspaceHref\(clientId, item\.section\);[\s\S]*?<Link\s+key=\{item\.section\}\s+href=\{href\}/,
  );
});

test("programmatic navigation runs only when unsaved-change guards allow it", async () => {
  const navigation = await import("../hooks/use-unsaved-changes-guard.ts");
  assert.equal(typeof navigation.runGuardedNavigation, "function");
  assert.equal(typeof navigation.PROGRAMMATIC_NAVIGATION_EVENT, "string");

  const cancelledTarget = new EventTarget();
  cancelledTarget.addEventListener(
    navigation.PROGRAMMATIC_NAVIGATION_EVENT,
    (event) => event.preventDefault(),
  );
  let cancelledCalls = 0;
  const cancelled = navigation.runGuardedNavigation(
    () => {
      cancelledCalls += 1;
    },
    cancelledTarget,
  );

  assert.equal(cancelled, false);
  assert.equal(cancelledCalls, 0);

  const allowedTarget = new EventTarget();
  let allowedCalls = 0;
  const allowed = navigation.runGuardedNavigation(
    () => {
      allowedCalls += 1;
    },
    allowedTarget,
  );

  assert.equal(allowed, true);
  assert.equal(allowedCalls, 1);
});

test("shows immediate route loading feedback", () => {
  const loading = source("../app/loading.tsx");
  assert.match(loading, /role="status"/);
  assert.match(loading, /motion-safe:animate-pulse/);
});

test("uses client routing after successful record saves", () => {
  for (const path of [
    "../components/new-article-form.tsx",
    "../components/edit-article-form.tsx",
    "../components/asset-form.tsx",
  ]) {
    const form = source(path);
    assert.match(form, /useRouter/);
    assert.doesNotMatch(form, /window\.location\.href = `\/(?:articles|assets)/);
  }
});
