import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
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

const baseUrl = (
  process.env.POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  "https://api-docs.softowetto.com"
).replace(/\/$/, "");

const superuserEmail = process.env.POCKETBASE_SUPERUSER_EMAIL;
const superuserPassword = process.env.POCKETBASE_SUPERUSER_PASSWORD;
const importedUserPassword =
  process.env.MINIKB_IMPORTED_USER_PASSWORD || superuserPassword;
const resetExistingUserPasswords =
  process.env.MINIKB_RESET_IMPORTED_USER_PASSWORDS === "true";

const csvPaths = {
  profiles: process.env.MINIKB_PROFILES_CSV ||
    "C:\\Users\\User\\Downloads\\profiles_rows.csv",
  assets: process.env.MINIKB_ASSETS_CSV ||
    "C:\\Users\\User\\Downloads\\assets_rows.csv",
  articles: process.env.MINIKB_ARTICLES_CSV ||
    "C:\\Users\\User\\Downloads\\articles_rows.csv",
};

if (!superuserEmail || !superuserPassword) {
  console.error(
    "Missing POCKETBASE_SUPERUSER_EMAIL or POCKETBASE_SUPERUSER_PASSWORD."
  );
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(value);
      if (row.some((item) => item !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }

    value += char;
  }

  row.push(value);
  if (row.some((item) => item !== "")) rows.push(row);

  const [headers = [], ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""]))
  );
}

function readCsv(path) {
  if (!existsSync(path)) {
    console.warn(`Skipping missing ${basename(path)}`);
    return [];
  }

  return parseCsv(readFileSync(path, "utf8"));
}

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
      // Keep status message.
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

function filterValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function findByLegacyId(token, collection, legacyId) {
  if (!legacyId) return null;

  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `legacy_id = "${filterValue(legacyId)}"`,
  });
  const response = await request(
    `/api/collections/${collection}/records?${params.toString()}`,
    { token }
  );

  return response.items[0] || null;
}

async function findUserByEmail(token, email) {
  if (!email) return null;

  const params = new URLSearchParams({
    page: "1",
    perPage: "1",
    filter: `email = "${filterValue(email)}"`,
  });
  const response = await request(
    `/api/collections/users/records?${params.toString()}`,
    { token }
  );

  return response.items[0] || null;
}

async function upsertRecord(token, collection, legacyId, payload) {
  const existing = await findByLegacyId(token, collection, legacyId);

  if (existing) {
    return request(`/api/collections/${collection}/records/${existing.id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(payload),
    });
  }

  return request(`/api/collections/${collection}/records`, {
    method: "POST",
    token,
    body: JSON.stringify({ ...payload, legacy_id: legacyId }),
  });
}

function nullable(value) {
  return value === undefined || value === null || value === "" ? null : value;
}

function parseBoolean(value) {
  return value === true || value === "true";
}

function parseJson(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function main() {
  const token = await authenticate();
  const profiles = readCsv(csvPaths.profiles);
  const assets = readCsv(csvPaths.assets);
  const articles = readCsv(csvPaths.articles);

  const userIds = new Map();
  const articleIds = new Map();
  const assetIds = new Map();

  for (const profile of profiles) {
    const existing = await findUserByEmail(token, profile.email);
    const payload = {
      email: profile.email,
      emailVisibility: true,
      verified: true,
      full_name: nullable(profile.full_name),
      role: profile.role || "viewer",
      legacy_id: profile.id,
      created_at: dateValue(profile.created_at),
    };

    const record = existing
      ? await request(`/api/collections/users/records/${existing.id}`, {
          method: "PATCH",
          token,
          body: JSON.stringify({
            ...payload,
            ...(resetExistingUserPasswords
              ? {
                  password: importedUserPassword,
                  passwordConfirm: importedUserPassword,
                }
              : {}),
          }),
        })
      : await request("/api/collections/users/records", {
          method: "POST",
          token,
          body: JSON.stringify({
            ...payload,
            password: importedUserPassword,
            passwordConfirm: importedUserPassword,
          }),
        });

    userIds.set(profile.id, record.id);
    console.log(`Imported user ${profile.email}`);
  }

  for (const article of articles) {
    const record = await upsertRecord(token, "articles", article.id, {
      title: article.title,
      slug: article.slug,
      summary: nullable(article.summary),
      content: article.content || "",
      company_id: nullable(article.company_id),
      category: article.category || "General",
      tags: parseJson(article.tags, []),
      is_pinned: parseBoolean(article.is_pinned),
      is_internal: parseBoolean(article.is_internal),
      created_by: userIds.get(article.created_by) || null,
      created_at: dateValue(article.created_at),
      updated_at: dateValue(article.updated_at),
    });

    articleIds.set(article.id, record.id);
    console.log(`Imported article ${article.title}`);
  }

  for (const asset of assets) {
    const record = await upsertRecord(token, "assets", asset.id, {
      company_id: nullable(asset.company_id),
      name: asset.name,
      asset_type: asset.asset_type || "other",
      description: nullable(asset.description),
      metadata: parseJson(asset.metadata, {}),
      created_by: userIds.get(asset.created_by) || null,
      created_at: dateValue(asset.created_at),
      updated_at: dateValue(asset.updated_at),
    });

    assetIds.set(asset.id, record.id);
    console.log(`Imported asset ${asset.name}`);
  }

  console.log(
    `Imported ${userIds.size} users, ${articleIds.size} articles, ${assetIds.size} assets into ${baseUrl}`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
