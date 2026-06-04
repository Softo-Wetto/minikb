"use client";

import { useState } from "react";
import { CheckCircle2, Settings2 } from "lucide-react";
import {
  createRecord,
  getCurrentAuth,
  updateRecord,
} from "@/lib/pocketbase/client";
import type { AdminSettingState } from "@/lib/admin-settings";
import type { AppSetting, Json, RawPocketBaseRecord } from "@/types/database";

type Props = {
  settings: AdminSettingState[];
  folders: string[];
};

function stringValue(value: Json | undefined, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: Json | undefined, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

export default function AdminSettingsForm({ settings, folders }: Props) {
  const [items, setItems] = useState(settings);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function saveSetting(setting: AdminSettingState, value: Json) {
    setSavingKey(setting.key);
    setMessage("");

    try {
      const auth = getCurrentAuth();
      const payload = {
        key: setting.key,
        value,
        description: setting.description,
        ...(auth?.user.id ? { updated_by: auth.user.id } : {}),
        updated_at: new Date().toISOString(),
        ...(!setting.id ? { created_at: new Date().toISOString() } : {}),
      };

      const record = setting.id
        ? await updateRecord<RawPocketBaseRecord & AppSetting>("app_settings", setting.id, payload)
        : await createRecord<RawPocketBaseRecord & AppSetting>("app_settings", payload);

      setItems((current) =>
        current.map((item) =>
          item.key === setting.key ? { ...item, id: record.id, value } : item
        )
      );

      await createRecord("activity_logs", {
        action: "setting.updated",
        target_collection: "app_settings",
        record_id: record.id,
        record_label: setting.label,
        detail: `${setting.label} changed to ${String(value)}`,
        ...(auth?.user.id ? { actor: auth.user.id } : {}),
        setting_id: record.id,
        created_at: new Date().toISOString(),
      });

      setMessage(`${setting.label} saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save setting.");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <section className="surface-panel overflow-hidden rounded-2xl">
      <div className="border-b border-slate-800 bg-slate-900/35 px-5 py-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-300">
          System Settings
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Workspace Defaults
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Set sensible defaults for new KB articles and publishing rules.
        </p>
      </div>

      {message && (
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900/50 px-5 py-3 text-sm text-slate-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          {message}
        </div>
      )}

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        {items.map((setting) => (
          <div
            key={setting.key}
            className="rounded border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-orange-300 ring-1 ring-slate-800">
                <Settings2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white">{setting.label}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">{setting.description}</p>

                <div className="mt-3">
                  {setting.kind === "boolean" ? (
                    <select
                      value={booleanValue(setting.value, true) ? "true" : "false"}
                      disabled={savingKey === setting.key}
                      onChange={(event) =>
                        saveSetting(setting, event.target.value === "true")
                      }
                      className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70 disabled:opacity-50"
                    >
                      <option value="true">Enabled</option>
                      <option value="false">Disabled</option>
                    </select>
                  ) : setting.kind === "folder" ? (
                    <select
                      value={stringValue(setting.value, "General")}
                      disabled={savingKey === setting.key}
                      onChange={(event) => saveSetting(setting, event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70 disabled:opacity-50"
                    >
                      {Array.from(new Set(["General", ...folders])).map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={stringValue(setting.value)}
                      disabled={savingKey === setting.key}
                      onChange={(event) => saveSetting(setting, event.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3 text-sm text-white outline-none transition focus:border-orange-500/70 disabled:opacity-50"
                    >
                      {setting.options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
