# MiniKB Editor Workflow Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a compact sticky editor toolbar, one article deletion action, recoverable local edits, PocketBase revision history, and reusable article templates.

**Architecture:** Keep browser-only recovery and data shaping in pure helpers. Add `article_revisions` and `article_templates` to the existing PocketBase setup, then integrate focused components into the current new/edit article forms without changing article attachment or role workflows.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tiptap 3, Tailwind CSS 4, PocketBase REST API, Node built-in test runner.

## Global Constraints

- Toolbar remains one non-wrapping row and sticks below the global header without a static blank gap.
- Deleting an article stays available only in the article-page Danger Zone.
- Recovery drafts are browser-local, opt-in to restore, and cleared only after a successful article save.
- Restoring a revision or template changes form state only; it never writes the article until an explicit save.
- Store at most 30 revisions per article and remove old revisions only after new revision creation succeeds.
- Editors create/read revisions and templates; administrators alone delete them.
- Do not add dependencies.

---

### Task 1: Testable Article Editing Helpers

**Files:**
- Create: `src/lib/article-editing.ts`
- Create: `src/lib/article-editing.test.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`

**Interfaces:**
- Produces `buildRecoveryKey`, `hasMeaningfulRecovery`, `shouldOfferRecovery`, `trimRevisions`, and `templateToArticleFields`.
- Consumes structural article/revision/template fields only; no React, browser storage, or PocketBase imports.

- [ ] **Step 1: Add the test command and failing tests**

Add `"test": "node --no-warnings --test --experimental-strip-types src/lib/article-editing.test.ts"` and exclude `**/*.test.ts` from the application `tsconfig`. Create tests asserting:

```ts
assert.equal(buildRecoveryKey("new"), "minikb_article_recovery_new");
assert.equal(buildRecoveryKey("abc"), "minikb_article_recovery_abc");
assert.equal(hasMeaningfulRecovery({ title: "", summary: "", content: "<p></p>" }), false);
assert.equal(shouldOfferRecovery(snapshot, "2026-07-22T10:00:00.000Z"), true);
assert.deepEqual(trimRevisions(revisions, 30).map((item) => item.id), revisions.slice(-30).map((item) => item.id));
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL because `article-editing.ts` does not exist.

- [ ] **Step 3: Implement the pure helper module**

Define `ArticleFormFields` as title, summary, content, category, tags, companyId, isPinned, isInternal, and isDraft. `hasMeaningfulRecovery` must ignore an empty `<p></p>` document. `templateToArticleFields` must preserve an existing company when a template has no company default.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm.cmd test`

Expected: every helper test PASS.

- [ ] **Step 5: Commit the helper slice**

```bash
git add package.json tsconfig.json src/lib/article-editing.ts src/lib/article-editing.test.ts
git commit -m "test: cover article editing workflow helpers"
```

### Task 2: PocketBase Collections And Shared Types

**Files:**
- Modify: `scripts/setup-pocketbase.mjs`
- Modify: `src/lib/pocketbase/types.ts`

**Interfaces:**
- Produces `ArticleRevision` and `ArticleTemplate` types.
- Produces `article_revisions` and `article_templates` collections used by Tasks 4 and 5.

- [ ] **Step 1: Add a failing type-use check**

Add a temporary type assertion in `article-editing.test.ts` that imports `ArticleTemplate` and calls `templateToArticleFields` with title, summary, content, category, tags, internal/pinned flags, and company ID.

- [ ] **Step 2: Run type-check and verify RED**

Run: `npx.cmd tsc --noEmit`

Expected: FAIL because the template and revision types do not exist.

- [ ] **Step 3: Add schema collections and types**

In `setup-pocketbase.mjs`, create `article_revisions` with relations to `articles` and `users`, integer revision number, article snapshot fields, save mode, and created time. Create `article_templates` with name, description, snapshot fields, optional company relation, creator, and timestamps. Use editor create/list/view/update rules and admin-only delete rules. Add matching types in `src/lib/pocketbase/types.ts`.

- [ ] **Step 4: Run type-check**

Run: `npx.cmd tsc --noEmit`

Expected: exits 0.

- [ ] **Step 5: Commit the schema slice**

```bash
git add scripts/setup-pocketbase.mjs src/lib/pocketbase/types.ts src/lib/article-editing.test.ts
git commit -m "feat: add article revision and template schema"
```

### Task 3: Compact Sticky Toolbar And Single Delete Action

**Files:**
- Modify: `src/components/rich-text-editor.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/articles/[id]/page.tsx`

**Interfaces:**
- Consumes existing Tiptap commands.
- Produces one non-wrapping toolbar row with a More menu and one article-page delete location.

- [ ] **Step 1: Add the toolbar layout regression checks**

Use source-level tests in `article-editing.test.ts` to assert the toolbar class contains `sticky`, a global-header offset, and `overflow-x-auto`, while excluding `flex-wrap` from the toolbar container.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL because the existing toolbar wraps and uses `top-0`.

- [ ] **Step 3: Rebuild the toolbar groups**

Keep essential controls in the primary strip. Put code, task list, quote, callouts, rule, image URL, and table structure operations in an accessible More `<details>` menu. Use `sticky top-20 z-30`, `flex-nowrap`, `overflow-x-auto`, smaller 36px icon buttons, and no parent overflow clipping. Retain file image upload and all existing commands.

- [ ] **Step 4: Remove duplicate header deletion**

Remove `DeleteArticleButton` from the article detail header and preserve the existing sidebar Danger Zone component.

- [ ] **Step 5: Run type-check and scoped lint**

Run: `npx.cmd tsc --noEmit`

Run: `npx.cmd eslint src/components/rich-text-editor.tsx src/app/articles/[id]/page.tsx`

Expected: both exit 0.

- [ ] **Step 6: Commit the editor interaction slice**

```bash
git add src/components/rich-text-editor.tsx src/app/globals.css src/app/articles/[id]/page.tsx src/lib/article-editing.test.ts
git commit -m "feat: streamline sticky article editor tools"
```

### Task 4: Recovery And Revision History

**Files:**
- Create: `src/components/article-recovery-banner.tsx`
- Create: `src/components/article-revision-history.tsx`
- Modify: `src/components/new-article-form.tsx`
- Modify: `src/components/edit-article-form.tsx`

**Interfaces:**
- Consumes `ArticleFormFields`, recovery helpers, `ArticleRevision`, and existing PocketBase client helpers.
- Produces browser-local recovery prompts and sidebar revision restore controls.

- [ ] **Step 1: Add failing recovery/revision helper tests**

Extend tests for a stale recovery snapshot, a new-article recovery snapshot, and a 31-item revision list. The 31-item assertion must keep exactly the newest 30 records.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL until recovery freshness and trimming behavior is implemented.

- [ ] **Step 3: Add recovery persistence to both forms**

Debounce localStorage writes by 700ms while dirty. Load a recoverable snapshot once per form and render `ArticleRecoveryBanner` with Restore and Discard. Clear the matching key only after `createRecord` or `updateRecord` succeeds.

- [ ] **Step 4: Add revision creation and restore**

Before updating an existing article, read current values from the form's original article prop and create an `article_revisions` record. Query recent revisions in `ArticleRevisionHistory`; Restore calls the form field setters and does not call `updateRecord`. After successful revision creation, remove excess oldest revisions beyond 30.

- [ ] **Step 5: Run tests and type-check**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Expected: both exit 0.

- [ ] **Step 6: Commit the recovery/revision slice**

```bash
git add src/components/article-recovery-banner.tsx src/components/article-revision-history.tsx src/components/new-article-form.tsx src/components/edit-article-form.tsx src/lib/article-editing.ts src/lib/article-editing.test.ts
git commit -m "feat: add article recovery and revisions"
```

### Task 5: Reusable Template Workflow

**Files:**
- Create: `src/components/article-template-picker.tsx`
- Create: `src/components/save-article-template-button.tsx`
- Create: `src/components/article-template-manager.tsx`
- Create: `src/app/articles/templates/page.tsx`
- Modify: `src/app/articles/new/page.tsx`
- Modify: `src/app/articles/[id]/edit/page.tsx`
- Modify: `src/components/new-article-form.tsx`
- Modify: `src/components/edit-article-form.tsx`

**Interfaces:**
- Consumes `ArticleTemplate`, `templateToArticleFields`, existing PocketBase helpers, and editor form setters.
- Produces template selection on creation, Save as Template during edit, and `/articles/templates` management.

- [ ] **Step 1: Add a failing template conversion test**

Assert that applying a template maps all snapshot fields and does not erase an existing company ID when `template.company_id` is null.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL until the preservation rule is implemented.

- [ ] **Step 3: Build the template picker and save dialog**

Load templates server-side in new/edit pages, pass them into forms, show a compact picker before new-article fields, and prompt before replacing meaningful content. Save as Template opens a name/description dialog and creates an `article_templates` record from current form fields.

- [ ] **Step 4: Add template management page**

Render editable name/description cards with apply links, update controls for editors, and delete controls only for administrators. Add a visible Templates entry from the new article workflow.

- [ ] **Step 5: Run tests, type-check, and scoped lint**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Run: `npx.cmd eslint src/components/article-template-picker.tsx src/components/save-article-template-button.tsx src/components/article-template-manager.tsx src/app/articles/templates/page.tsx`

Expected: all commands exit 0.

- [ ] **Step 6: Commit the template slice**

```bash
git add src/components/article-template-picker.tsx src/components/save-article-template-button.tsx src/components/article-template-manager.tsx src/app/articles/templates/page.tsx src/app/articles/new/page.tsx src/app/articles/[id]/edit/page.tsx src/components/new-article-form.tsx src/components/edit-article-form.tsx src/lib/article-editing.ts src/lib/article-editing.test.ts
git commit -m "feat: add reusable article templates"
```

### Task 6: End-to-End Verification

**Files:**
- Modify only files already in scope when verification reveals a defect.

**Interfaces:**
- Consumes all previous tasks.
- Produces a deployable Next.js and OpenNext Cloudflare build.

- [ ] **Step 1: Run automated verification**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: tests, type-check, lint, and production build complete successfully.

- [ ] **Step 2: Start the local application**

Run: `npm.cmd run dev -- -p 3000`

Expected: an available localhost port serves the Minikb login page and authenticated article editor without server errors.

- [ ] **Step 3: Verify editor and workflow states**

Check desktop and narrow widths for toolbar stickiness, no top gap, horizontal toolbar scrolling, More menu, image upload, article-page single delete action, recovery Restore/Discard, revision restore without immediate persistence, template apply confirmation, and template management delete controls.

- [ ] **Step 4: Commit verification fixes**

```bash
git add src scripts package.json tsconfig.json
git commit -m "fix: polish article editing workflow"
```
