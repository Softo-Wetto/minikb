import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const rawKey = trimmed.slice(0, equalsIndex).trim();
    const key = rawKey.startsWith("$env:") ? rawKey.slice(5) : rawKey;
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const pocketBaseUrl =
  process.env.POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  "https://api-docs.softowetto.com";

const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;

if (!superuserEmail || !superuserPassword) {
  console.error(
    "Missing POCKETBASE_SUPERUSER_EMAIL or POCKETBASE_SUPERUSER_PASSWORD."
  );
  console.error(
    "Example: $env:POCKETBASE_SUPERUSER_EMAIL='you@example.com'; $env:POCKETBASE_SUPERUSER_PASSWORD='secret'; npm run pb:setup"
  );
  process.exit(1);
}

const baseUrl = pocketBaseUrl.replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    let message = `${options.method || "GET"} ${path} failed (${response.status})`;

    try {
      const body = await response.json();
      message = [
        body.message || message,
        body.data ? JSON.stringify(body.data, null, 2) : "",
      ]
        .filter(Boolean)
        .join("\n");
    } catch {
      // Keep the status message.
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function authenticate() {
  const body = JSON.stringify({
    identity: superuserEmail,
    password: superuserPassword,
  });

  try {
    const auth = await request("/api/collections/_superusers/auth-with-password", {
      method: "POST",
      body,
    });
    return auth.token;
  } catch {
    const auth = await request("/api/admins/auth-with-password", {
      method: "POST",
      body,
    });
    return auth.token;
  }
}

async function getCollection(token, name) {
  try {
    return await request(`/api/collections/${name}`, { token });
  } catch {
    return null;
  }
}

function mergeFields(existingFields = [], desiredFields = []) {
  const byName = new Map(existingFields.map((field) => [field.name, field]));

  for (const desired of desiredFields) {
    const existing = byName.get(desired.name);
    byName.set(desired.name, {
      ...(existing || {}),
      ...desired,
      id: existing?.id,
      system: existing?.system ?? false,
    });
  }

  return Array.from(byName.values());
}

async function upsertCollection(token, definition) {
  const existing = await getCollection(token, definition.name);

  if (!existing) {
    await request("/api/collections", {
      method: "POST",
      token,
      body: JSON.stringify(definition),
    });
    console.log(`Created ${definition.name}`);
    return getCollection(token, definition.name);
  }

  const update = {
    ...definition,
    fields: mergeFields(existing.fields, definition.fields),
  };

  await request(`/api/collections/${existing.id}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(update),
  });
  console.log(`Updated ${definition.name}`);
  return getCollection(token, definition.name);
}

function text(name, options = {}) {
  return { name, type: "text", required: false, ...options };
}

function editor(name, options = {}) {
  return { name, type: "editor", required: false, ...options };
}

function bool(name, options = {}) {
  return { name, type: "bool", required: false, ...options };
}

function number(name, options = {}) {
  return { name, type: "number", required: false, ...options };
}

function date(name, options = {}) {
  return { name, type: "date", required: false, ...options };
}

function json(name, options = {}) {
  return { name, type: "json", required: false, ...options };
}

function select(name, values, options = {}) {
  return {
    name,
    type: "select",
    values,
    maxSelect: 1,
    required: false,
    ...options,
  };
}

function relation(name, collectionId, options = {}) {
  return {
    name,
    type: "relation",
    collectionId,
    cascadeDelete: false,
    maxSelect: 1,
    minSelect: 0,
    required: false,
    ...options,
  };
}

function file(name, options = {}) {
  return {
    name,
    type: "file",
    maxSelect: 1,
    maxSize: 104857600,
    mimeTypes: [],
    protected: false,
    thumbs: [],
    required: false,
    ...options,
  };
}

function editableRules() {
  return {
    listRule: '@request.auth.id != ""',
    viewRule: '@request.auth.id != ""',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "editor"',
    updateRule: '@request.auth.role = "admin" || @request.auth.role = "editor"',
    deleteRule: '@request.auth.role = "admin"',
  };
}

async function main() {
  const token = await authenticate();

  const users = await upsertCollection(token, {
    name: "users",
    type: "auth",
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.id != ""',
    createRule: "",
    updateRule: '@request.auth.id = id || @request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    fields: [
      text("legacy_id"),
      text("username"),
      text("full_name"),
      select("role", ["admin", "editor", "viewer"], { required: true }),
      date("created_at"),
    ],
    passwordAuth: {
      enabled: true,
      identityFields: ["email"],
    },
  });

  const companies = await upsertCollection(token, {
    name: "companies",
    type: "base",
    ...editableRules(),
    indexes: ["CREATE UNIQUE INDEX idx_companies_slug ON companies (slug)"],
    fields: [
      text("legacy_id"),
      text("name", { required: true }),
      text("slug", { required: true }),
      text("description"),
      text("website"),
      relation("created_by", users.id),
      date("created_at"),
      date("updated_at"),
    ],
  });

  const articles = await upsertCollection(token, {
    name: "articles",
    type: "base",
    ...editableRules(),
    indexes: ["CREATE UNIQUE INDEX idx_articles_slug ON articles (slug)"],
    fields: [
      text("legacy_id"),
      text("title", { required: true }),
      text("slug", { required: true }),
      text("summary"),
      editor("content", { required: true }),
      relation("company_id", companies.id),
      text("category"),
      json("tags"),
      bool("is_pinned"),
      bool("is_internal"),
      bool("is_draft"),
      relation("created_by", users.id),
      date("created_at"),
      date("updated_at"),
    ],
  });

  await upsertCollection(token, {
    name: "article_folders",
    type: "base",
    ...editableRules(),
    indexes: ["CREATE UNIQUE INDEX idx_article_folders_name ON article_folders (name)"],
    fields: [
      text("name", { required: true }),
      number("sort_order"),
      relation("created_by", users.id),
      date("created_at"),
      date("updated_at"),
    ],
  });

  const appSettings = await upsertCollection(token, {
    name: "app_settings",
    type: "base",
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: '@request.auth.role = "admin"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    indexes: ["CREATE UNIQUE INDEX idx_app_settings_key ON app_settings (key)"],
    fields: [
      text("key", { required: true }),
      json("value"),
      text("description"),
      relation("updated_by", users.id),
      date("created_at"),
      date("updated_at"),
    ],
  });

  await upsertCollection(token, {
    name: "activity_logs",
    type: "base",
    listRule: '@request.auth.role = "admin"',
    viewRule: '@request.auth.role = "admin"',
    createRule: '@request.auth.role = "admin" || @request.auth.role = "editor"',
    updateRule: '@request.auth.role = "admin"',
    deleteRule: '@request.auth.role = "admin"',
    fields: [
      text("action", { required: true }),
      text("target_collection"),
      text("record_id"),
      text("record_label"),
      text("detail"),
      relation("actor", users.id),
      relation("setting_id", appSettings.id),
      date("created_at"),
    ],
  });

  const assets = await upsertCollection(token, {
    name: "assets",
    type: "base",
    ...editableRules(),
    fields: [
      text("legacy_id"),
      relation("company_id", companies.id),
      text("name", { required: true }),
      select("asset_type", [
        "domain",
        "server",
        "firewall",
        "m365_tenant",
        "wifi",
        "printer",
        "workstation",
        "other",
      ]),
      text("description"),
      json("metadata"),
      relation("created_by", users.id),
      date("created_at"),
      date("updated_at"),
    ],
  });

  await upsertCollection(token, {
    name: "attachments",
    type: "base",
    ...editableRules(),
    fields: [
      text("legacy_id"),
      relation("article_id", articles.id),
      relation("asset_id", assets.id),
      file("file"),
      text("file_name", { required: true }),
      text("file_path"),
      number("file_size"),
      text("mime_type"),
      relation("uploaded_by", users.id),
      date("created_at"),
    ],
  });

  console.log(`MiniKB PocketBase schema is ready at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
