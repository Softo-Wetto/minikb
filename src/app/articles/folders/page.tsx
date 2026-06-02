import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ArticleFolderManager from "@/components/article-folder-manager";
import { requireEditor } from "@/lib/auth";
import { getArticleFolderOptions } from "@/lib/article-folders";

export default async function ArticleFoldersPage() {
  await requireEditor();

  const folders = await getArticleFolderOptions();

  return (
    <div className="space-y-4">
      <Link
        href="/articles"
        className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Articles
      </Link>

      <ArticleFolderManager initialFolders={folders} />
    </div>
  );
}
