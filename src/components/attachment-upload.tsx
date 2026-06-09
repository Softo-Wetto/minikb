"use client";

import { useState } from "react";
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
      setUploading(false);
      setUploadCount(0);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-900/55 p-3">
      <label className="block text-sm font-semibold text-slate-100">
        Upload files
      </label>
      <p className="mt-1 text-xs text-slate-500">
        Add PDFs, images, exports, or supporting documents.
      </p>
      <input
        type="file"
        multiple
        onChange={handleUpload}
        className="mt-3 block w-full text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={uploading}
      />
      {uploading && (
        <p className="mt-2 text-sm text-slate-400">
          Uploading {uploadCount} {uploadCount === 1 ? "file" : "files"}...
        </p>
      )}
    </div>
  );
}
