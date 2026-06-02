"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import {
  createRecord,
  deleteRecord,
  getClientRecords,
  getCurrentAuth,
  updateRecord,
} from "@/lib/pocketbase/client";
import type { ArticleFolderOption } from "@/lib/article-folders";
import type { ArticleFolder, RawPocketBaseRecord } from "@/types/database";

type ArticleRow = RawPocketBaseRecord & {
  category: string | null;
};

function normalizeFolder(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export default function ArticleFolderManager({
  initialFolders,
}: {
  initialFolders: ArticleFolderOption[];
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [newFolder, setNewFolder] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const folderNames = useMemo(() => folders.map((folder) => folder.name), [folders]);

  async function ensureManaged(folder: ArticleFolderOption, index: number) {
    if (folder.id) return folder.id;

    const auth = getCurrentAuth();
    const record = await createRecord<ArticleFolder>("article_folders", {
      name: folder.name,
      sort_order: index + 1,
      ...(auth?.user.id ? { created_by: auth.user.id } : {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    setFolders((current) =>
      current.map((item) =>
        item.name === folder.name
          ? { ...item, id: record.id, managed: true, sort_order: index + 1 }
          : item,
      ),
    );

    return record.id;
  }

  async function updateFolderOrder(nextFolders: ArticleFolderOption[]) {
    setBusy("order");
    setMessage("");

    try {
      for (const [index, folder] of nextFolders.entries()) {
        const id = await ensureManaged(folder, index);
        await updateRecord("article_folders", id, {
          sort_order: index + 1,
          updated_at: new Date().toISOString(),
        });
      }

      setFolders(
        nextFolders.map((folder, index) => ({
          ...folder,
          sort_order: index + 1,
          managed: true,
        })),
      );
      setMessage("Folder order saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update folder order.");
    } finally {
      setBusy(null);
    }
  }

  async function moveFolder(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= folders.length) return;

    const next = [...folders];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    await updateFolderOrder(next);
  }

  async function createFolder() {
    const name = normalizeFolder(newFolder);
    if (!name) return;
    if (folderNames.some((folder) => folder.toLowerCase() === name.toLowerCase())) {
      setMessage("That folder already exists.");
      return;
    }

    setBusy("create");
    setMessage("");

    try {
      const auth = getCurrentAuth();
      const sortOrder = folders.length + 1;
      const record = await createRecord<ArticleFolder>("article_folders", {
        name,
        sort_order: sortOrder,
        ...(auth?.user.id ? { created_by: auth.user.id } : {}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      setFolders((current) => [
        ...current,
        {
          id: record.id,
          name,
          sort_order: sortOrder,
          articleCount: 0,
          managed: true,
        },
      ]);
      setNewFolder("");
      setMessage(`Created ${name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create folder.");
    } finally {
      setBusy(null);
    }
  }

  async function getArticlesInFolder(name: string) {
    const articles: ArticleRow[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await getClientRecords<ArticleRow>(
        "articles",
        new URLSearchParams({
          page: String(page),
          perPage: "200",
          fields: "id,category",
          filter: `category = "${escapeFilterValue(name)}"`,
        }),
      );

      articles.push(...response.items);
      totalPages = response.totalPages || 1;
      page += 1;
    } while (page <= totalPages);

    return articles;
  }

  async function renameFolder(folder: ArticleFolderOption) {
    const nextName = normalizeFolder(editingName);
    if (!nextName || nextName === folder.name) {
      setEditing(null);
      return;
    }

    if (folderNames.some((name) => name.toLowerCase() === nextName.toLowerCase())) {
      setMessage("That folder already exists.");
      return;
    }

    setBusy(folder.name);
    setMessage("");

    try {
      const index = folders.findIndex((item) => item.name === folder.name);
      const id = await ensureManaged(folder, Math.max(index, 0));
      await updateRecord("article_folders", id, {
        name: nextName,
        updated_at: new Date().toISOString(),
      });

      const articles = await getArticlesInFolder(folder.name);
      await Promise.all(
        articles.map((article) =>
          updateRecord("articles", article.id, {
            category: nextName,
            updated_at: new Date().toISOString(),
          }),
        ),
      );

      setFolders((current) =>
        current.map((item) =>
          item.name === folder.name
            ? { ...item, id, name: nextName, managed: true }
            : item,
        ),
      );
      setEditing(null);
      setMessage(`Renamed ${folder.name} to ${nextName}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to rename folder.");
    } finally {
      setBusy(null);
    }
  }

  async function deleteFolder(folder: ArticleFolderOption) {
    if (folder.name === "General") {
      setMessage("General cannot be deleted.");
      return;
    }

    const fallback = folderNames.find((name) => name !== folder.name) || "General";
    const replacement =
      window.prompt(
        `Move ${folder.articleCount} article(s) from "${folder.name}" to which folder?`,
        fallback,
      ) || "";
    const replacementName = normalizeFolder(replacement);

    if (!replacementName || replacementName === folder.name) return;

    if (!window.confirm(`Delete "${folder.name}" and move its articles to "${replacementName}"?`)) {
      return;
    }

    setBusy(folder.name);
    setMessage("");

    try {
      const articles = await getArticlesInFolder(folder.name);
      await Promise.all(
        articles.map((article) =>
          updateRecord("articles", article.id, {
            category: replacementName,
            updated_at: new Date().toISOString(),
          }),
        ),
      );

      if (folder.id) {
        await deleteRecord("article_folders", folder.id);
      }

      setFolders((current) => {
        const replacementExists = current.some((item) => item.name === replacementName);
        const withoutDeleted = current.filter((item) => item.name !== folder.name);
        const movedCount = articles.length || folder.articleCount;

        return replacementExists
          ? withoutDeleted.map((item) =>
              item.name === replacementName
                ? { ...item, articleCount: item.articleCount + movedCount }
                : item,
            )
          : [
              ...withoutDeleted,
              {
                name: replacementName,
                sort_order: null,
                articleCount: movedCount,
                managed: false,
              },
            ];
      });

      setMessage(`Deleted ${folder.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete folder.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface-panel overflow-hidden rounded-2xl">
        <div className="border-b border-slate-800 bg-slate-900/35 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
            Knowledge Base
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Folder Management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Create folders, rename existing categories, delete folders by moving their
            articles, and set the order used by article pickers and filters.
          </p>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded border border-slate-800 bg-slate-950/80 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <FolderPlus className="h-4 w-4 text-orange-300" />
              New Folder
            </h2>
            <div className="mt-4 flex gap-2">
              <input
                value={newFolder}
                onChange={(event) => setNewFolder(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    createFolder();
                  }
                }}
                placeholder="Folder name"
                className="min-w-0 flex-1 rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-orange-500/70"
              />
              <button
                type="button"
                onClick={createFolder}
                disabled={busy === "create" || !normalizeFolder(newFolder)}
                className="inline-flex h-10 items-center gap-2 rounded bg-orange-500 px-3 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:opacity-50"
              >
                Add
              </button>
            </div>

            {message && (
              <div className="mt-4 rounded border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-300">
                {message}
              </div>
            )}
          </aside>

          <section className="overflow-hidden rounded border border-slate-800 bg-slate-950/80">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold text-white">Folders</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {folders.length} folder{folders.length === 1 ? "" : "s"} configured or detected
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-800">
              {folders.map((folder, index) => {
                const isEditing = editing === folder.name;
                const isBusy = busy === folder.name || busy === "order";

                return (
                  <div
                    key={folder.name}
                    className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_110px_160px]"
                  >
                    <div className="min-w-0">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                            className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500/70"
                          />
                          <button
                            type="button"
                            onClick={() => renameFolder(folder)}
                            disabled={isBusy}
                            className="inline-flex h-10 w-10 items-center justify-center rounded bg-orange-500 text-white transition hover:bg-orange-400 disabled:opacity-50"
                            title="Save folder name"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditing(null)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded border border-slate-700 text-slate-300 transition hover:text-white"
                            title="Cancel rename"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-orange-300 ring-1 ring-slate-800">
                            <Folder className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">
                              {folder.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {folder.managed ? "Managed folder" : "Detected from articles"}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-slate-400">
                      {folder.articleCount} article{folder.articleCount === 1 ? "" : "s"}
                    </div>

                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => moveFolder(index, -1)}
                        disabled={index === 0 || isBusy}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-800 text-slate-400 transition hover:border-orange-500/50 hover:text-orange-200 disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFolder(index, 1)}
                        disabled={index === folders.length - 1 || isBusy}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-800 text-slate-400 transition hover:border-orange-500/50 hover:text-orange-200 disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(folder.name);
                          setEditingName(folder.name);
                        }}
                        disabled={isBusy}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-800 text-slate-400 transition hover:border-orange-500/50 hover:text-orange-200 disabled:opacity-30"
                        title="Rename"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFolder(folder)}
                        disabled={folder.name === "General" || isBusy}
                        className="inline-flex h-9 w-9 items-center justify-center rounded border border-slate-800 text-slate-400 transition hover:border-red-500/50 hover:text-red-200 disabled:opacity-30"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
