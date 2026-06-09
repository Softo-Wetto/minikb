"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
} from "lucide-react";
import AttachmentUpload from "@/components/attachment-upload";
import { deleteRecord } from "@/lib/pocketbase/client";
import { getPocketBaseFileUrl } from "@/lib/pocketbase/config";
import type { Attachment } from "@/types/database";

type AttachmentItem = Pick<
  Attachment,
  "id" | "file" | "file_name" | "file_path" | "file_size" | "mime_type"
>;

type AttachmentManagerProps = {
  attachments: AttachmentItem[];
  articleId?: string;
  assetId?: string;
  canManage?: boolean;
};

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes < 1) return "Unknown size";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1)} ${units[unitIndex]}`;
}

function fileKind(mimeType?: string | null, fileName?: string | null) {
  const type = mimeType?.toLowerCase() ?? "";
  const name = fileName?.toLowerCase() ?? "";

  if (type.includes("image") || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
    return { label: "Image", icon: ImageIcon, tone: "text-sky-200" };
  }

  if (type.includes("pdf") || name.endsWith(".pdf")) {
    return { label: "PDF", icon: FileText, tone: "text-red-200" };
  }

  if (/\.(zip|7z|rar|tar|gz)$/.test(name)) {
    return { label: "Archive", icon: Archive, tone: "text-violet-200" };
  }

  return { label: mimeType || "File", icon: Paperclip, tone: "text-orange-200" };
}

export default function AttachmentManager({
  attachments,
  articleId,
  assetId,
  canManage = false,
}: AttachmentManagerProps) {
  const [items, setItems] = useState(attachments);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + (item.file_size ?? 0), 0),
    [items]
  );

  function fileUrl(file: AttachmentItem) {
    return getPocketBaseFileUrl(
      "attachments",
      file.id,
      file.file || file.file_path
    );
  }

  async function copyLink(file: AttachmentItem) {
    const url = fileUrl(file);
    if (!url) return;

    await navigator.clipboard.writeText(url);
    setCopiedId(file.id);
    window.setTimeout(() => setCopiedId(null), 1800);
  }

  async function deleteAttachment(file: AttachmentItem) {
    const confirmed = window.confirm(
      `Delete "${file.file_name}"? This will remove the file from this record.`
    );
    if (!confirmed) return;

    setDeletingId(file.id);

    try {
      await deleteRecord("attachments", file.id);
      setItems((current) => current.filter((item) => item.id !== file.id));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not delete file.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {canManage && (
        <AttachmentUpload
          articleId={articleId}
          assetId={assetId}
          onUploaded={() => window.location.reload()}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-800 bg-slate-900/35 px-3 py-2 text-xs text-slate-500">
        <span>
          {items.length} {items.length === 1 ? "file" : "files"}
        </span>
        <span>{formatFileSize(totalSize)}</span>
      </div>

      {items.length === 0 && (
        <div className="rounded border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
          No files attached.
        </div>
      )}

      {items.map((file) => {
        const url = fileUrl(file);
        const kind = fileKind(file.mime_type, file.file_name);
        const Icon = kind.icon;
        const isDeleting = deletingId === file.id;

        return (
          <div
            key={file.id}
            className="group rounded border border-slate-800 bg-slate-900/45 p-3 transition hover:border-slate-700 hover:bg-slate-900/70"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-950 ring-1 ring-slate-800">
                <Icon className={`h-5 w-5 ${kind.tone}`} />
              </div>

              <div className="min-w-0 flex-1">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-semibold text-slate-100 transition hover:text-orange-200"
                    title={file.file_name}
                  >
                    {file.file_name}
                  </a>
                ) : (
                  <div
                    className="truncate text-sm font-semibold text-slate-100"
                    title={file.file_name}
                  >
                    {file.file_name}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{kind.label}</span>
                  <span aria-hidden="true">/</span>
                  <span>{formatFileSize(file.file_size)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {url && (
                <>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-slate-700 px-2 text-xs font-semibold text-slate-300 transition hover:border-orange-400/60 hover:text-orange-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                  <a
                    href={url}
                    download={file.file_name}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-slate-700 px-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/60 hover:text-sky-200"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => void copyLink(file)}
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-slate-700 px-2 text-xs font-semibold text-slate-300 transition hover:border-emerald-400/60 hover:text-emerald-200"
                  >
                    {copiedId === file.id ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copiedId === file.id ? "Copied" : "Copy"}
                  </button>
                </>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => void deleteAttachment(file)}
                  disabled={isDeleting}
                  className="inline-flex h-8 items-center justify-center gap-1.5 rounded border border-red-500/35 px-2 text-xs font-semibold text-red-200 transition hover:border-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
