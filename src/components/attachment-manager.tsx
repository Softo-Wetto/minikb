"use client";

import { useMemo, useRef, useState } from "react";
import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  Trash2,
} from "lucide-react";
import AttachmentUpload from "@/components/attachment-upload";
import {
  deleteRecord,
  replaceAttachment,
} from "@/lib/pocketbase/client";
import { getPocketBaseFileUrl } from "@/lib/pocketbase/config";
import { mergeReplacedAttachment } from "@/lib/attachment-files";
import type { Attachment } from "@/types/database";

type AttachmentItem = Pick<
  Attachment,
  | "id"
  | "file"
  | "file_name"
  | "file_path"
  | "file_size"
  | "mime_type"
  | "updated_at"
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

const actionClassName =
  "inline-flex h-8 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-slate-700 bg-slate-950/55 px-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/60 hover:bg-slate-900 hover:text-orange-100 disabled:cursor-not-allowed disabled:opacity-55";

export default function AttachmentManager({
  attachments,
  articleId,
  assetId,
  canManage = false,
}: AttachmentManagerProps) {
  const [items, setItems] = useState(attachments);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const replacementTargetRef = useRef<AttachmentItem | null>(null);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + (item.file_size ?? 0), 0),
    [items],
  );

  function fileUrl(file: AttachmentItem) {
    const url = getPocketBaseFileUrl(
      "attachments",
      file.id,
      file.file || file.file_path,
    );

    if (!url || !file.updated_at) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(file.updated_at)}`;
  }

  function chooseReplacement(file: AttachmentItem) {
    replacementTargetRef.current = file;
    replacementInputRef.current?.click();
  }

  async function handleReplacement(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.currentTarget.files?.[0];
    const target = replacementTargetRef.current;
    event.currentTarget.value = "";

    if (!selectedFile || !target) {
      replacementTargetRef.current = null;
      return;
    }

    setReplacingId(target.id);

    try {
      const replacement = await replaceAttachment({
        attachmentId: target.id,
        file: selectedFile,
      });
      const nextItem: AttachmentItem = {
        id: replacement.id,
        file: replacement.file,
        file_name: replacement.file_name,
        file_path: replacement.file_path,
        file_size: replacement.file_size,
        mime_type: replacement.mime_type,
        updated_at: replacement.updated_at,
      };

      setItems((current) => mergeReplacedAttachment(current, nextItem));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not replace file.");
    } finally {
      replacementTargetRef.current = null;
      setReplacingId(null);
    }
  }

  async function deleteAttachment(file: AttachmentItem) {
    const confirmed = window.confirm(
      `Delete "${file.file_name}"? This will remove the file from this record.`,
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
      <input
        ref={replacementInputRef}
        type="file"
        className="sr-only"
        aria-label="Choose replacement file"
        onChange={handleReplacement}
      />

      {canManage && (
        <AttachmentUpload
          articleId={articleId}
          assetId={assetId}
          onUploaded={() => window.location.reload()}
        />
      )}

      <div className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-900/35 px-3 py-2.5">
        <div>
          <p className="text-xs font-semibold text-slate-300">
            {items.length} {items.length === 1 ? "attachment" : "attachments"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600">Stored with this record</p>
        </div>
        <span className="rounded-md border border-slate-800 bg-slate-950/70 px-2 py-1 text-xs font-medium text-slate-400">
          {formatFileSize(totalSize)}
        </span>
      </div>

      {items.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-800 px-4 py-7 text-center">
          <Paperclip className="mx-auto h-5 w-5 text-slate-700" />
          <p className="mt-2 text-sm font-medium text-slate-400">No files attached</p>
          <p className="mt-1 text-xs text-slate-600">Add the first supporting file above.</p>
        </div>
      )}

      {items.map((file) => {
        const url = fileUrl(file);
        const kind = fileKind(file.mime_type, file.file_name);
        const Icon = kind.icon;
        const isDeleting = deletingId === file.id;
        const isReplacing = replacingId === file.id;

        return (
          <div
            key={file.id}
            className="group rounded-lg border border-slate-800 bg-slate-900/40 p-3 transition hover:border-slate-700 hover:bg-slate-900/65"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-800 bg-slate-950">
                <Icon className={`h-4 w-4 ${kind.tone}`} />
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
                  <p className="truncate text-sm font-semibold text-slate-100" title={file.file_name}>
                    {file.file_name}
                  </p>
                )}
                <div className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                  <span className="truncate">{kind.label}</span>
                  <span aria-hidden="true" className="text-slate-700">/</span>
                  <span className="shrink-0">{formatFileSize(file.file_size)}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {url && (
                <>
                  <a href={url} target="_blank" rel="noreferrer" className={actionClassName}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                  <a href={url} download={file.file_name} className={actionClassName}>
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => chooseReplacement(file)}
                  disabled={isReplacing || isDeleting}
                  className={actionClassName}
                >
                  {isReplacing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {isReplacing ? "Replacing" : "Replace"}
                </button>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => void deleteAttachment(file)}
                  disabled={isDeleting || isReplacing}
                  className={`${actionClassName} hover:border-red-400/70 hover:bg-red-500/10 hover:text-red-200`}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  {isDeleting ? "Deleting" : "Delete"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
