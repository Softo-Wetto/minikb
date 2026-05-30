"use client";

import { useState } from "react";
import { createAttachment } from "@/lib/pocketbase/client";

export default function AttachmentUpload({
  articleId,
  assetId,
}: {
  articleId?: string;
  assetId?: string;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      await createAttachment({ articleId, assetId, file });
      window.location.reload();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Upload failed.");
      setUploading(false);
    }
  }

  return (
    <div className="rounded border border-slate-800 bg-slate-900/50 p-3">
      <label className="block text-sm font-medium text-slate-200">
        Upload attachment
      </label>
      <input
        type="file"
        onChange={handleUpload}
        className="mt-3 block w-full text-sm text-slate-400 file:mr-3 file:rounded file:border-0 file:bg-orange-500 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-orange-400"
        disabled={uploading}
      />
      {uploading && <p className="mt-2 text-sm text-slate-400">Uploading...</p>}
    </div>
  );
}
