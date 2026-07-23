# Personal Knowledge Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MiniKB useful as a personal operational workbench by adding capture and follow-up items, intentional article links, backlinks, and tag discovery.

**Architecture:** `work_items` is a small PocketBase collection that stores personal tasks, notes, and ideas. Client dashboard components create and update those records through the established PocketBase client. Article relationships use normal internal article anchors and a pure helper that finds outgoing and inbound links from existing article HTML, avoiding a new graph database or editor-only data structure.

**Tech Stack:** Next.js App Router, React 19, TypeScript, PocketBase REST API, Lucide, Tailwind CSS, Node test runner.

## Global Constraints

- Keep client and company knowledge linkable across the whole workspace.
- Do not add a collaboration, role, or approval workflow.
- Use the existing direct PocketBase client helpers and cloud-compatible build path.
- Add focused test coverage before each core helper implementation.

---

### Task 1: Linked Article Helpers

**Files:**
- Modify: `src/lib/article-editing.ts`
- Modify: `src/lib/article-editing.test.ts`

**Interfaces:**
- Produces: `extractArticleLinkIds(content: string): string[]`
- Produces: `findLinkedArticles<T extends { id: string }>(content: string, articles: T[]): T[]`

- [ ] Write a failing test proving internal `/articles/<id>` anchors are deduplicated and external URLs are ignored.
- [ ] Run `npm test` and confirm the new assertion fails because the helper does not exist.
- [ ] Implement the parser and resolver without mutating article content.
- [ ] Run `npm test` and confirm all link-helper tests pass.

### Task 2: Persistent Work Items

**Files:**
- Modify: `scripts/setup-pocketbase.mjs`
- Modify: `src/lib/pocketbase/types.ts`
- Create: `src/lib/work-items.ts`
- Create: `src/lib/work-items.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `WorkItem` type with `kind`, `status`, `title`, `note`, and optional due/article/company relationships.
- Produces: `sortWorkItems<T extends WorkItem>(items: T[]): T[]` with open work before completed work and soonest due work first.

- [ ] Write a failing sort test for open, overdue, undated, and completed work items.
- [ ] Run the focused test and confirm it fails before the helper exists.
- [ ] Add a `work_items` PocketBase collection using existing editable/auth rules and the required fields.
- [ ] Implement the type and sorting helper.
- [ ] Run all unit tests.

### Task 3: Dashboard Capture and Follow-ups

**Files:**
- Create: `src/components/quick-capture.tsx`
- Create: `src/components/work-item-board.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/dashboard-overview.tsx`

**Interfaces:**
- Consumes: `WorkItem[]`, existing `createRecord`, `updateRecord`, `deleteRecord` helpers.
- Produces: dashboard quick capture for task/note/idea and a compact actionable follow-up board.

- [ ] Fetch work items in the server dashboard page without allowing an unavailable collection to break the dashboard.
- [ ] Add a client capture control that validates a title, creates a work item, and refreshes server data.
- [ ] Add a client board that marks open items done and removes completed clutter after confirmation.
- [ ] Verify typecheck, lint, and dashboard rendering.

### Task 4: Connected Article Discovery

**Files:**
- Modify: `src/components/rich-text-editor.tsx`
- Modify: `src/components/new-article-form.tsx`
- Modify: `src/components/edit-article-form.tsx`
- Modify: `src/app/articles/new/page.tsx`
- Modify: `src/app/articles/[id]/edit/page.tsx`
- Modify: `src/app/articles/[id]/page.tsx`
- Modify: `src/app/articles/page.tsx`

**Interfaces:**
- Consumes: a list of article `{ id, title }` options and link helpers from Task 1.
- Produces: an editor control that inserts a selected internal article anchor, plus Related, Linked from, and tag-filtered article views.

- [ ] Pass safe article link options into article creation and edit forms.
- [ ] Add an accessible compact internal-article link control to the existing rich-text editor.
- [ ] Resolve outgoing links and backlinks on the article detail page, showing central and company articles together.
- [ ] Add tag query filtering and tag chips to article discovery.
- [ ] Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
