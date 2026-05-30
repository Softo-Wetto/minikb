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
  "https://minikb.duckdns.org"
).replace(/\/$/, "");

const email =
  process.env.MINIKB_TEST_USER_EMAIL ||
  process.env.POCKETBASE_SUPERUSER_EMAIL ||
  "nightmareasian@gmail.com";
const password =
  process.env.MINIKB_TEST_USER_PASSWORD ||
  process.env.MINIKB_IMPORTED_USER_PASSWORD ||
  process.env.POCKETBASE_SUPERUSER_PASSWORD;

async function printResponse(label, response) {
  const text = await response.text();
  console.log(`\n${label}: ${response.status}`);
  console.log(text);
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

const auth = await printResponse("auth", authResponse);
if (!authResponse.ok) process.exit(1);

const headers = { Authorization: `Bearer ${auth.token}` };

const collectionResponse = await fetch(`${baseUrl}/api/collections/articles`, {
  headers,
});
await printResponse("articles collection", collectionResponse);

const articleListNoSort = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20`,
  { headers }
);
await printResponse("articles list no sort", articleListNoSort);

const articleListCreatedSort = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20&sort=-created_at`,
  { headers }
);
await printResponse("articles list sort created", articleListCreatedSort);

const articleList = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20&sort=-updated_at`,
  { headers }
);
const articleListBody = await printResponse("articles list", articleList);

const fieldsList = await fetch(
  `${baseUrl}/api/collections/articles/records?page=1&perPage=20&sort=-updated_at&fields=id,title,category,summary,created_at,updated_at,is_pinned,is_internal`,
  { headers }
);
await printResponse("articles list with fields", fieldsList);

const first = articleListBody?.items?.[0];
if (first) {
  const relatedFilter = encodeURIComponent(
    `category = "${first.category || "General"}" && id != "${first.id}"`
  );
  const related = await fetch(
    `${baseUrl}/api/collections/articles/records?page=1&perPage=5&fields=id,title&filter=${relatedFilter}`,
    { headers }
  );
  await printResponse("related articles", related);

  const attachmentFilter = encodeURIComponent(`article_id = "${first.id}"`);
  const attachments = await fetch(
    `${baseUrl}/api/collections/attachments/records?page=1&perPage=20&sort=-created_at&filter=${attachmentFilter}`,
    { headers }
  );
  await printResponse("attachments article_id equals", attachments);

  const attachmentBackRelationFilter = encodeURIComponent(
    `article_id.id = "${first.id}"`
  );
  const attachmentsBackRelation = await fetch(
    `${baseUrl}/api/collections/attachments/records?page=1&perPage=20&sort=-created_at&filter=${attachmentBackRelationFilter}`,
    { headers }
  );
  await printResponse("attachments article_id.id equals", attachmentsBackRelation);
}
