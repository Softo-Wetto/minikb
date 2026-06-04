import { getRecords } from "@/lib/pocketbase/server";
import type { AppSetting, Json, RawPocketBaseRecord } from "@/types/database";

export type AdminSettingKey =
  | "default_article_visibility"
  | "default_article_folder"
  | "default_new_article_status"
  | "allow_public_articles";

export type AdminSettingDefinition = {
  key: AdminSettingKey;
  label: string;
  description: string;
  defaultValue: Json;
  kind: "select" | "boolean" | "folder";
  options?: Array<{ label: string; value: string }>;
};

export const ADMIN_SETTING_DEFINITIONS: AdminSettingDefinition[] = [
  {
    key: "default_article_visibility",
    label: "Default article visibility",
    description: "Controls whether new KB articles start as internal or public.",
    defaultValue: "internal",
    kind: "select",
    options: [
      { label: "Internal", value: "internal" },
      { label: "Public", value: "public" },
    ],
  },
  {
    key: "default_article_folder",
    label: "Default KB folder",
    description: "Preselects a folder when creating a new article.",
    defaultValue: "General",
    kind: "folder",
  },
  {
    key: "default_new_article_status",
    label: "Default new article action",
    description: "Controls whether the primary new-article button saves a draft or publishes.",
    defaultValue: "published",
    kind: "select",
    options: [
      { label: "Publish", value: "published" },
      { label: "Save Draft", value: "draft" },
    ],
  },
  {
    key: "allow_public_articles",
    label: "Allow public KB articles",
    description: "When disabled, new articles are forced to internal visibility.",
    defaultValue: true,
    kind: "boolean",
  },
];

export type AdminSettingState = AdminSettingDefinition & {
  id?: string;
  value: Json;
};

export async function getAdminSettings(): Promise<AdminSettingState[]> {
  let records: Array<RawPocketBaseRecord & AppSetting> = [];

  try {
    const response = await getRecords<RawPocketBaseRecord & AppSetting>("app_settings", {
      fields: "id,key,value,description,updated_by,created_at,updated_at",
      perPage: 100,
    });
    records = response.items;
  } catch {
    records = [];
  }

  const byKey = new Map(records.map((record) => [record.key, record]));

  return ADMIN_SETTING_DEFINITIONS.map((definition) => {
    const record = byKey.get(definition.key);

    return {
      ...definition,
      id: record?.id,
      value: record?.value ?? definition.defaultValue,
    };
  });
}

export function getSettingValue<T extends Json>(
  settings: AdminSettingState[],
  key: AdminSettingKey,
  fallback: T,
): T {
  const setting = settings.find((item) => item.key === key);
  return (setting?.value ?? fallback) as T;
}
