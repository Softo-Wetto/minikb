import assert from "node:assert/strict";
import test from "node:test";
import type { ArticleTemplate } from "./pocketbase/types.ts";

import {
  buildRecoveryKey,
  hasMeaningfulRecovery,
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