export type ArticleFormFields = {
  title: string;
  summary: string;
  content: string;
  category: string;
  tags: string;
  companyId: string;
  isPinned: boolean;
  isInternal: boolean;
  isDraft: boolean;
};

export type RecoverySnapshot = ArticleFormFields & {
  savedAt: string;
};

export type ArticleTemplateFields = {
  title: string;
  summary: string | null;
  content: string;
  category: string | null;
  tags: string[] | null;
  company_id: string | null;
  is_pinned: boolean;
  is_internal: boolean;
};


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseRecoverySnapshot(value: string | null): RecoverySnapshot | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) return null;

    const stringFields = [
      "title",
      "summary",
      "content",
      "category",
      "tags",
      "companyId",
      "savedAt",
    ] as const;
    const booleanFields = ["isPinned", "isInternal", "isDraft"] as const;

    if (
      stringFields.some((field) => typeof parsed[field] !== "string") ||
      booleanFields.some((field) => typeof parsed[field] !== "boolean")
    ) {
      return null;
    }

    return parsed as RecoverySnapshot;
  } catch {
    return null;
  }
}
export function buildRecoveryKey(articleId?: string) {
  return `minikb_article_recovery_${articleId || "new"}`;
}

export function hasMeaningfulRecovery(fields: ArticleFormFields) {
  const textContent = fields.content
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return Boolean(
    fields.title.trim() ||
      fields.summary.trim() ||
      textContent ||
      fields.tags.trim() ||
      fields.companyId ||
      fields.isPinned ||
      !fields.isInternal ||
      fields.isDraft
  );
}

export function shouldOfferRecovery(
  snapshot: RecoverySnapshot,
  serverUpdatedAt?: string | null
) {
  if (!hasMeaningfulRecovery(snapshot)) return false;

  const savedAt = Date.parse(snapshot.savedAt);
  if (Number.isNaN(savedAt)) return false;

  if (!serverUpdatedAt) return true;
  const serverUpdated = Date.parse(serverUpdatedAt);
  return Number.isNaN(serverUpdated) || savedAt > serverUpdated;
}

export function trimRevisions<T extends { revision_number: number }>(
  revisions: T[],
  limit = 30
) {
  return [...revisions]
    .sort((left, right) => left.revision_number - right.revision_number)
    .slice(-limit);
}

export function templateToArticleFields(
  template: ArticleTemplateFields,
  existingCompanyId = ""
): ArticleFormFields {
  return {
    title: template.title,
    summary: template.summary || "",
    content: template.content || "<p></p>",
    category: template.category || "General",
    tags: (template.tags || []).join(", "),
    companyId: template.company_id || existingCompanyId,
    isPinned: Boolean(template.is_pinned),
    isInternal: Boolean(template.is_internal),
    isDraft: false,
  };
}
