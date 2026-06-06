"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import {
  deleteRecord,
  getClientRecords,
} from "@/lib/pocketbase/client";
import type { Attachment, RawPocketBaseRecord } from "@/types/database";

type Props = {
  articleId: string;
  articleTitle: string;
  companyId?: string | null;
  className?: string;
};

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default function DeleteArticleButton({
  articleId,
  articleTitle,
  companyId,
  className,
}: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteArticle() {
    const confirmed = window.confirm(
      `Delete "${articleTitle}"?\n\nThis will permanently remove the KB article and its attached files.`
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        perPage: "200",
        fields: "id",
        filter: `article_id = "${escapeFilterValue(articleId)}"`,
      });
      const attachments = await getClientRecords<RawPocketBaseRecord & Pick<Attachment, "id">>(
        "attachments",
        params
      );

      await Promise.all(
        attachments.items.map((attachment) => deleteRecord("attachments", attachment.id))
      );
      await deleteRecord("articles", articleId);

      router.push(companyId ? `/articles?companyId=${encodeURIComponent(companyId)}` : "/articles");
      router.refresh();
    } catch (error) {
      console.error("Delete article error:", error);
      alert(error instanceof Error ? error.message : "Unable to delete article.");
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={deleteArticle}
      disabled={deleting}
      className={
        className ||
        "inline-flex h-9 items-center gap-2 rounded border border-red-500/35 bg-red-500/10 px-3 text-sm font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/15 disabled:opacity-50"
      }
    >
      {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
