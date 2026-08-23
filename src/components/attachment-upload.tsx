"use client";

import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { createAttachment } from "@/lib/pocketbase/client";

export default function AttachmentUpload({
  articleId,
  assetId,
  onUploaded,
}: {
  articleId?: string;
  assetId?: string;
  onUploaded?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadCount(files.length);

    try {
      for (const file of files) {
        await createAttachment({ articleId, assetId, file });
      }
      onUploaded?.();
      if (!onUploaded) {
        window.location.reload();
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      e.target.value = "";
      setUploading(false);
      setUploadCount(0);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/45 p-3.5 transition hover:border-orange-500/45 hover:bg-slate-900/65">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-orange-500/20 bg-orange-500/10 text-orange-300">
          <FileUp className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">Add files</p>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">
            PDFs, images, exports, and supporting documents.
          </p>
        </div>
      </div>

      <label
        className={`mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-950/70 px-3 text-xs font-semibold text-slate-200 transition ${
          uploading
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-orange-400/55 hover:bg-slate-900 hover:text-orange-100"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileUp className="h-3.5 w-3.5" />
        )}
        {uploading
          ? `Uploading ${uploadCount} ${uploadCount === 1 ? "file" : "files"}`
          : "Choose files"}
        <input
          type="file"
          multiple
          onChange={handleUpload}
          className="sr-only"
          disabled={uploading}
        />
      </label>
    </div>
  );
}
