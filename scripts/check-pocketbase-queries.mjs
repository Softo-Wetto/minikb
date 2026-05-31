import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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

const email =
  process.env.MINIKB_TEST_USER_EMAIL ||
  process.env.POCKETBASE_SUPERUSER_EMAIL ||
  "nightmareasian@gmail.com";
const password =
  process.env.MINIKB_TEST_USER_PASSWORD ||
  process.env.MINIKB_IMPORTED_USER_PASSWORD ||
  process.env.POCKETBASE_SUPERUSER_PASSWORD;

async function readResponse(label, response) {
  const text = await response.text();
  console.log(`${label}: ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function authenticate(path) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
}

let authResponse = await authenticate(
  "/api/collections/users/auth-with-password"
);

if (!authResponse.ok) {
  authResponse = await authenticate(
    "/api/collections/_superusers/auth-with-password"
  );
}

if (!authResponse.ok) {
  authResponse = await authenticate("/api/admins/auth-with-password");
}

const auth = await readResponse("auth", authResponse);
if (!authResponse.ok) process.exit(1);

const headers = { Authorization: `Bearer ${auth.token}` };

const collectionResponse = await fetch(`${baseUrl}/api/collections/articles`, {
  headers,
});
const collection = await readResponse("articles collection", collectionResponse);
if (collectionResponse.ok) {
  console.log(`articles fields=${collection.fields?.length ?? 0}`);
}

const articleListNoSort = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20`,
  { headers }
);
const articleListNoSortBody = await readResponse("articles list no sort", articleListNoSort);
if (articleListNoSort.ok) {
  console.log(`articles no sort total=${articleListNoSortBody.totalItems ?? 0}`);
}

const articleListCreatedSort = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20&sort=-created_at`,
  { headers }
);
const articleListCreatedSortBody = await readResponse(
  "articles list sort created",
  articleListCreatedSort
);
if (articleListCreatedSort.ok) {
  console.log(`articles created sort total=${articleListCreatedSortBody.totalItems ?? 0}`);
}

const articleList = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20&sort=-updated_at`,
  { headers }
);
const articleListBody = await readResponse("articles list", articleList);
if (articleList.ok) {
  console.log(`articles total=${articleListBody.totalItems ?? 0}`);
}

const fieldsList = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20&sort=-updated_at&fields=id,title,category,summary,created_at,updated_at,is_pinned,is_internal`,
  { headers }
);
const fieldsListBody = await readResponse("articles list with fields", fieldsList);
if (fieldsList.ok) {
  console.log(`articles fields query total=${fieldsListBody.totalItems ?? 0}`);
}

const first = articleListBody?.items?.[0];
if (first) {
  const relatedFilter = encodeURIComponent(
    `category = "${first.category || "General"}" && id != "${first.id}"`
  );
  const related = await fetch(
    `${baseUrl}/api/collections/articles/records?page=1&perPage=5&fields=id,title&filter=${relatedFilter}`,
    { headers }
  );
  const relatedBody = await readResponse("related articles", related);
  if (related.ok) {
    console.log(`related total=${relatedBody.totalItems ?? 0}`);
  }

  const attachmentFilter = encodeURIComponent(`article_id = "${first.id}"`);
  const attachments = await fetch(
    `${baseUrl}/api/collections/attachments/records?page=1&perPage=20&sort=-created_at&filter=${attachmentFilter}`,
    { headers }
  );
  const attachmentsBody = await readResponse("attachments article_id equals", attachments);
  if (attachments.ok) {
    console.log(`attachments total=${attachmentsBody.totalItems ?? 0}`);
  }

  const attachmentBackRelationFilter = encodeURIComponent(
    `article_id.id = "${first.id}"`
  );
  const attachmentsBackRelation = await fetch(
    `${baseUrl}/api/collections/attachments/records?page=1&perPage=20&sort=-created_at&filter=${attachmentBackRelationFilter}`,
    { headers }
  );
  const attachmentsBackRelationBody = await readResponse(
    "attachments article_id.id equals",
    attachmentsBackRelation
  );
  if (attachmentsBackRelation.ok) {
    console.log(`attachments relation total=${attachmentsBackRelationBody.totalItems ?? 0}`);
  }
}
