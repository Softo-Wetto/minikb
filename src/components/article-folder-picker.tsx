"use client";

import { useMemo, useState } from "react";
import { Check, Folder, FolderPlus } from "lucide-react";

type Props = {
  value: string;
  folders: string[];
  onChange: (folder: string) => void;
};

function normalizeFolder(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export default function ArticleFolderPicker({ value, folders, onChange }: Props) {
  const [newFolder, setNewFolder] = useState("");
  const [localFolders, setLocalFolders] = useState<string[]>([]);

  const options = useMemo(() => {
    return Array.from(
      new Set(
        ["General", ...folders, ...localFolders, value]
          .map((folder) => normalizeFolder(folder || ""))
          .filter(Boolean),
      ),
    );
  }, [folders, localFolders, value]);

  const selectedFolder = normalizeFolder(value) || "General";

  function createFolder() {
    const folder = normalizeFolder(newFolder);
    if (!folder) return;

    setLocalFolders((current) => Array.from(new Set([...current, folder])));
    onChange(folder);
    setNewFolder("");
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
          <Folder className="h-4 w-4 text-orange-300" />
          Folder
        </label>
        <select
          value={selectedFolder}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition focus:border-orange-500/70"
        >
          {options.map((folder) => (
            <option key={folder} value={folder}>
              {folder}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-2">
        <input
          value={newFolder}
          onChange={(event) => setNewFolder(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              createFolder();
            }
          }}
          placeholder="New folder name"
          className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
        />
        <button
          type="button"
          onClick={createFolder}
          disabled={!normalizeFolder(newFolder)}
          className="inline-flex h-10 items-center gap-2 rounded border border-orange-500/40 bg-orange-500/10 px-3 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/60 disabled:text-slate-600"
        >
          <FolderPlus className="h-4 w-4" />
          Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {options.slice(0, 8).map((folder) => {
          const active = folder === selectedFolder;

          return (
            <button
              key={folder}
              type="button"
              onClick={() => onChange(folder)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition ${
                active
                  ? "border-orange-500/60 bg-orange-500/15 text-orange-100"
                  : "border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-600 hover:text-white"
              }`}
            >
              {active && <Check className="h-3 w-3" />}
              {folder}
            </button>
          );
        })}
      </div>
    </div>
  );
}
