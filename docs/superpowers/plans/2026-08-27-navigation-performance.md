# MiniKB Navigation Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce MiniKB route latency by deduplicating authentication, issuing independent PocketBase reads concurrently, preserving the Next.js application shell during internal navigation, and showing immediate route feedback.

**Architecture:** Keep PocketBase and page responses private and uncached across requests. Use React request-scoped `cache` for authentication only, `Promise.allSettled` for independent reads with the existing empty-state fallbacks, and App Router navigation/loading primitives for perceived responsiveness.

**Tech Stack:** Next.js 16 App Router, React 19 server cache, TypeScript, PocketBase REST helpers, Node test runner, Tailwind CSS, OpenNext Cloudflare.

**Spec:** `docs/superpowers/specs/2026-08-27-navigation-performance-design.md`

## Global Constraints

- Keep private PocketBase reads and page responses uncached across requests.
- Continue validating the current PocketBase user record for authorization.
- Preserve existing page filtering, permissions, empty-state fallbacks, and UI styling.
- Keep hard navigation for login and sign-out authentication boundaries.
- Do not add a new dependency or cross-request data cache.

---

### Task 1: Request-Scoped Authentication Deduplication

**Files:**
- Modify: `src/lib/pocketbase/server.ts`
- Create: `src/lib/navigation-performance.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `cookies(): Promise<ReadonlyRequestCookies>`, `pbRequest<T>()`, `normalizeUser()`.
- Produces: existing `getServerAuth(): Promise<PocketBaseAuth | null>` and `getServerUser(): Promise<UserProfile | null>` signatures, now memoized per React server render.

- [ ] **Step 1: Write the failing authentication regression test**

Create `src/lib/navigation-performance.test.ts` with source-level assertions that `server.ts` imports `cache` from React, wraps both authentication readers, and continues to fetch `/api/collections/users/records/` rather than trusting only cookie profile data:

```ts
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
```

Add `src/lib/navigation-performance.test.ts` to the `npm test` command in `package.json`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: FAIL because `getServerAuth` and `getServerUser` are ordinary functions.

- [ ] **Step 3: Memoize the existing authentication readers**

In `src/lib/pocketbase/server.ts`, import `cache` and convert the two exported functions without changing their bodies:

```ts
import { cache } from "react";

export const getServerAuth = cache(async (): Promise<PocketBaseAuth | null> => {
  const cookieStore = await cookies();
  return parseAuthCookie(cookieStore.get("minikb_pb_auth")?.value);
});

export const getServerUser = cache(async () => {
  const auth = await getServerAuth();
  if (!auth) return null;

  try {
    const user = await pbRequest<RawPocketBaseRecord>(
      `/api/collections/users/records/${auth.user.id}`,
      { token: auth.token },
    );
    return normalizeUser(user);
  } catch {
    return null;
  }
});
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json src/lib/pocketbase/server.ts src/lib/navigation-performance.test.ts
git commit -m "perf: deduplicate server authentication reads"
```

---

### Task 2: Concurrent Collection and Dashboard Reads

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/articles/page.tsx`
- Modify: `src/app/assets/page.tsx`
- Modify: `src/app/companies/page.tsx`
- Modify: `src/lib/article-folders.ts`
- Modify: `src/lib/navigation-performance.test.ts`

**Interfaces:**
- Consumes: existing `getRecords<T>()`, `getArticleFolderOptions()` and page-specific result types.
- Produces: unchanged page component props and rendered output, with independent reads started together.

- [ ] **Step 1: Write failing concurrency checks**

Extend `navigation-performance.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: FAIL for the dashboard, articles, assets, companies, and folder helper files that still await independent requests sequentially.

- [ ] **Step 3: Parallelize each page while preserving fallbacks**

Use `Promise.allSettled` around the existing `getRecords` calls. Assign fulfilled `.value.items` to the current safe arrays and assign `[]` on rejection. For the articles page, retain the rejected article request as the displayed `error` while companies and folders still degrade to empty arrays.

In `article-folders.ts`, start the managed-folder and article-category requests together:

```ts
const [folderResult, categoryResult] = await Promise.allSettled([
  getRecords<ArticleFolder>("article_folders", folderOptions),
  getRecords<CategoryRow>("articles", categoryOptions),
]);

managedFolders = folderResult.status === "fulfilled" ? folderResult.value.items : [];
categoryRows = categoryResult.status === "fulfilled" ? categoryResult.value.items : [];
```

- [ ] **Step 4: Run focused and full tests**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS with unchanged filtering and folder tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/articles/page.tsx src/app/assets/page.tsx src/app/companies/page.tsx src/lib/article-folders.ts src/lib/navigation-performance.test.ts
git commit -m "perf: parallelize collection page queries"
```

---

### Task 3: Concurrent Detail and Editor Reads

**Files:**
- Modify: `src/app/articles/[id]/page.tsx`
- Modify: `src/app/articles/new/page.tsx`
- Modify: `src/app/articles/[id]/edit/page.tsx`
- Modify: `src/app/assets/[id]/page.tsx`
- Modify: `src/app/assets/[id]/edit/page.tsx`
- Modify: `src/app/companies/[id]/page.tsx`
- Modify: `src/lib/navigation-performance.test.ts`

**Interfaces:**
- Consumes: route `params`, existing `getRecord<T>()`, `getRecords<T>()`, folder and settings loaders.
- Produces: the same form/detail component props and not-found behavior.

- [ ] **Step 1: Write failing detail-route concurrency checks**

```ts
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: FAIL for detail/editor routes whose independent reads are still sequential.

- [ ] **Step 3: Parallelize route-safe requests**

- Article detail: load the primary article first, then load attachments and relationship candidates with one `Promise.allSettled`.
- Asset detail: load the primary asset first, then load its optional company and attachments together.
- New article: load companies, templates, article link options, folders, and settings together.
- Edit article: use the route ID to load the article, companies, revisions, templates, article link options, and folders together; preserve article not-found handling.
- Edit asset: load the asset and company options together.
- Company detail: use the route ID to load company, articles, and assets together; apply fulfilled pagination metadata exactly as before.

Keep console logging for attachment failures and empty-array fallbacks for optional records.

- [ ] **Step 4: Run focused and full tests**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/articles src/app/assets src/app/companies/[id]/page.tsx src/lib/navigation-performance.test.ts
git commit -m "perf: parallelize detail and editor queries"
```

---

### Task 4: Shell-Preserving Navigation and Loading Feedback

**Files:**
- Create: `src/app/loading.tsx`
- Modify: `src/components/app-header.tsx`
- Modify: `src/components/app-sidebar.tsx`
- Modify: `src/components/new-article-form.tsx`
- Modify: `src/components/edit-article-form.tsx`
- Modify: `src/components/asset-form.tsx`
- Modify: `src/lib/navigation-performance.test.ts`

**Interfaces:**
- Consumes: Next.js `Link`, `useRouter`, existing destination URLs and unsaved-change release callbacks.
- Produces: prefetchable sidebar links, client-side internal redirects, and a root route loading boundary.

- [ ] **Step 1: Write failing navigation and loading checks**

```ts
test("preserves the app shell during optimized internal navigation", () => {
  const header = source("../components/app-header.tsx");
  const sidebar = source("../components/app-sidebar.tsx");

  assert.match(header, /useRouter/);
  assert.doesNotMatch(header, /window\.location\.href = "\/articles"/);
  assert.doesNotMatch(header, /window\.location\.href = `\/articles\?q=/);
  assert.match(sidebar, /<Link[\s\S]*companyWorkspaceHref/);
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
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: FAIL because the loading boundary is absent and internal hard navigation remains.

- [ ] **Step 3: Implement client navigation**

- Add `const router = useRouter()` to the header and active forms.
- Replace internal article search and successful save assignments with `router.push(destination)`.
- Keep `window.location.href = "/login"` for sign-out and the login redirect after authentication.
- Replace client workspace `<button onClick={router.push}>` elements with `<Link href={href} scroll={!stayingOnCompanyPage}>` while preserving active classes and counts.

- [ ] **Step 4: Add the route loading boundary**

Create `src/app/loading.tsx` with a compact skeleton that matches MiniKB surfaces:

```tsx
export default function Loading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className="space-y-4">
      <div className="surface-panel h-24 motion-safe:animate-pulse" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card h-32 motion-safe:animate-pulse" />
        <div className="surface-card h-32 motion-safe:animate-pulse" />
        <div className="surface-card h-32 motion-safe:animate-pulse" />
      </div>
      <div className="surface-card h-72 motion-safe:animate-pulse" />
      <span className="sr-only">Loading page...</span>
    </div>
  );
}
```

- [ ] **Step 5: Run focused and full tests**

Run: `node --test --experimental-strip-types src/lib/navigation-performance.test.ts`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/loading.tsx src/components/app-header.tsx src/components/app-sidebar.tsx src/components/new-article-form.tsx src/components/edit-article-form.tsx src/components/asset-form.tsx src/lib/navigation-performance.test.ts
git commit -m "perf: preserve shell during route transitions"
```

---

### Task 5: Production Verification

**Files:**
- Verify only; modify a task-owned file if a check exposes a regression.

**Interfaces:**
- Consumes: completed Tasks 1-4.
- Produces: verified Next.js and OpenNext Cloudflare artifacts.

- [ ] **Step 1: Run the complete test suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

- [ ] **Step 2: Run static analysis**

Run: `npm run lint`

Expected: ESLint exits 0 with no errors.

- [ ] **Step 3: Run the production and Cloudflare build**

Run: `npm run build`

Expected: Next.js compilation, TypeScript, static route generation, and OpenNext Cloudflare bundle all complete successfully.

- [ ] **Step 4: Check patch integrity**

Run: `git diff --check`

Expected: exit 0 with no whitespace errors.

- [ ] **Step 5: Review the final diff**

Confirm that `cache: "no-store"`, middleware no-store headers, PocketBase authorization headers, and role validation remain present. Confirm no production URL, credentials, or generated build artifacts were committed.
