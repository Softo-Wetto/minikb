import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import type { ArticleTemplate } from "./pocketbase/types.ts";

import {
  buildRecoveryKey,
  hasMeaningfulRecovery,
  parseRecoverySnapshot,
  shouldOfferRecovery,
  templateToArticleFields,
  trimRevisions,
} from "./article-editing.ts";

test("builds isolated recovery keys for new and existing articles", () => {
  assert.equal(buildRecoveryKey(), "minikb_article_recovery_new");
  assert.equal(buildRecoveryKey("abc"), "minikb_article_recovery_abc");
});

test("ignores a completely empty recovery draft", () => {
  assert.equal(
    hasMeaningfulRecovery({
      title: "",
      summary: "",
      content: "<p></p>",
      category: "",
      tags: "",
      companyId: "",
      isPinned: false,
      isInternal: true,
      isDraft: false,
    }),
    false
  );
});

test("offers a newer meaningful recovery draft", () => {
  assert.equal(
    shouldOfferRecovery(
      {
        title: "VPS storage checks",
        summary: "",
        content: "<p>Check the disks.</p>",
        category: "General",
        tags: "",
        companyId: "",
        isPinned: false,
        isInternal: true,
        isDraft: false,
        savedAt: "2026-07-22T10:05:00.000Z",
      },
      "2026-07-22T10:00:00.000Z"
    ),
    true
  );
});


test("parses only complete recovery snapshots", () => {
  const snapshot = parseRecoverySnapshot(
    JSON.stringify({
      title: "Recovered notes",
      summary: "",
      content: "<p>Draft content</p>",
      category: "General",
      tags: "",
      companyId: "",
      isPinned: false,
      isInternal: true,
      isDraft: true,
      savedAt: "2026-07-22T10:05:00.000Z",
    })
  );

  assert.equal(snapshot?.title, "Recovered notes");
  assert.equal(parseRecoverySnapshot('{"title":"missing fields"}'), null);
});
test("keeps the newest thirty revisions", () => {
  const revisions = Array.from({ length: 31 }, (_, index) => ({
    id: String(index + 1),
    revision_number: index + 1,
  }));

  assert.deepEqual(
    trimRevisions(revisions, 30).map((item) => item.id),
    revisions.slice(-30).map((item) => item.id)
  );
});

test("applies a template without erasing the selected company", () => {
  const template = {
    title: "Server handover",
    summary: "A repeatable handover checklist.",
    content: "<p>Document credentials.</p>",
    category: "Operations",
    tags: ["handover", "server"],
    company_id: null,
    is_pinned: true,
    is_internal: false,
  } as Pick<
    ArticleTemplate,
    | "title"
    | "summary"
    | "content"
    | "category"
    | "tags"
    | "company_id"
    | "is_pinned"
    | "is_internal"
  >;
  const fields = templateToArticleFields(template, "company_123");

  assert.deepEqual(fields, {
    title: "Server handover",
    summary: "A repeatable handover checklist.",
    content: "<p>Document credentials.</p>",
    category: "Operations",
    tags: "handover, server",
    companyId: "company_123",
    isPinned: true,
    isInternal: false,
    isDraft: false,
  });
});
test("extracts unique internal article links without treating external links as KB links", async () => {
  const moduleUnderTest = await import("./article-editing.ts") as unknown as {
    extractArticleLinkIds?: unknown;
  };
  const extract = moduleUnderTest.extractArticleLinkIds;

  assert.equal(typeof extract, "function");
  if (typeof extract !== "function") return;

  assert.deepEqual(
    (extract as (content: string) => string[])(
      [
        '<p><a href="/articles/backup-plan">Backup plan</a></p>',
        '<a href="/articles/network-map?view=compact">Network map</a>',
        '<a href="/articles/backup-plan">Duplicate</a>',
        '<a href="https://example.com/articles/external">External</a>',
        '<a href="/assets/server-01">Asset</a>',
      ].join(""),
    ),
    ["backup-plan", "network-map"],
  );
});

test("keeps the editor toolbar sticky, compact, and scrollable", () => {
  const source = readFileSync(
    new URL("../components/rich-text-editor.tsx", import.meta.url),
    "utf8"
  );
  const match = source.match(
    /<div\s+data-editor-toolbar\s+className="([^"]+)"/
  );

  assert.ok(match, "toolbar should have a stable test hook");
  assert.match(match[1], /sticky/);
  assert.match(match[1], /top-16/);
  assert.match(source, /overflow-x-auto/);
  assert.doesNotMatch(match[1], /flex-wrap/);
});

test("keeps article deletion in one detail-page danger zone", () => {
  const source = readFileSync(
    new URL("../app/articles/[id]/page.tsx", import.meta.url),
    "utf8"
  );

  assert.equal((source.match(/<DeleteArticleButton/g) || []).length, 1);
});
test("does not trap the sticky toolbar inside an overflow-hidden editor panel", () => {
  const source = readFileSync(
    new URL("../components/edit-article-form.tsx", import.meta.url),
    "utf8"
  );

  assert.doesNotMatch(source, /section className="min-w-0 overflow-hidden/);
});
test("wires recovery and revision components into article forms", () => {
  const root = new URL("../", import.meta.url);
  assert.equal(
    existsSync(new URL("components/article-recovery-banner.tsx", root)),
    true
  );
  assert.equal(
    existsSync(new URL("components/article-revision-history.tsx", root)),
    true
  );
  assert.equal(
    existsSync(new URL("hooks/use-article-recovery.ts", root)),
    true
  );

  const newForm = readFileSync(
    new URL("../components/new-article-form.tsx", import.meta.url),
    "utf8"
  );
  const editForm = readFileSync(
    new URL("../components/edit-article-form.tsx", import.meta.url),
    "utf8"
  );

  assert.match(newForm, /useArticleRecovery/);
  assert.match(editForm, /useArticleRecovery/);
  assert.match(editForm, /ArticleRevisionHistory/);
  assert.match(editForm, /revisions: ArticleRevision\[\]/);
});
test("wires reusable templates into article creation and editing", () => {
  const root = new URL("../", import.meta.url);
  for (const path of [
    "components/article-template-picker.tsx",
    "components/save-article-template-button.tsx",
    "components/article-template-manager.tsx",
    "app/articles/templates/page.tsx",
  ]) {
    assert.equal(existsSync(new URL(path, root)), true, `${path} should exist`);
  }

  const newForm = readFileSync(
    new URL("../components/new-article-form.tsx", import.meta.url),
    "utf8"
  );
  const editForm = readFileSync(
    new URL("../components/edit-article-form.tsx", import.meta.url),
    "utf8"
  );

  assert.match(newForm, /ArticleTemplatePicker/);
  assert.match(editForm, /SaveArticleTemplateButton/);
  const templatePicker = readFileSync(
    new URL("../components/article-template-picker.tsx", import.meta.url),
    "utf8"
  );
  assert.doesNotMatch(templatePicker, /setSelectedId\(template\.id\)/);
});
test("wires internal article links through the editor and article forms", () => {
  const root = new URL("../", import.meta.url);
  const editor = readFileSync(
    new URL("components/rich-text-editor.tsx", root),
    "utf8"
  );
  const newForm = readFileSync(
    new URL("components/new-article-form.tsx", root),
    "utf8"
  );
  const editForm = readFileSync(
    new URL("components/edit-article-form.tsx", root),
    "utf8"
  );

  assert.match(editor, /articleOptions/);
  assert.match(editor, /insertArticleLink/);
  assert.match(newForm, /articleOptions/);
  assert.match(editForm, /articleOptions/);
});
