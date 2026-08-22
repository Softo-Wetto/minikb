import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { userCollectionRules } from "./access-policy.mjs";

function loadEnvFile(fileName) {
  const filePath = resolve(process.cwd(), fileName);
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    process.env[key] ??= value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const baseUrl = (
  process.env.POCKETBASE_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL || ""
).replace(/\/$/, "");
const identity = process.env.POCKETBASE_SUPERUSER_EMAIL;
const password = process.env.POCKETBASE_SUPERUSER_PASSWORD;

if (!baseUrl || !identity || !password) {
  throw new Error("PocketBase URL and superuser credentials are required.");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // The status is enough for this security probe when a response is not JSON.
  }

  return { response, data };
}

async function authenticateSuperuser() {
  const body = JSON.stringify({ identity, password });
  const options = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  };

  let result = await request(
    "/api/collections/_superusers/auth-with-password",
    options,
  );

  if (!result.response.ok) {
    result = await request("/api/admins/auth-with-password", options);
  }

  if (!result.response.ok || !result.data.token) {
    throw new Error("Could not authenticate the PocketBase superuser.");
  }

  return result.data.token;
}

async function main() {
  const token = await authenticateSuperuser();
  const authHeaders = { Authorization: `Bearer ${token}` };
  const collection = await request("/api/collections/users", {
    headers: authHeaders,
  });

  if (!collection.response.ok) {
    throw new Error("Could not read the live users collection.");
  }

  for (const [rule, expected] of Object.entries(userCollectionRules)) {
    if (collection.data[rule] !== expected) {
      throw new Error(`Live users.${rule} does not match the local policy.`);
    }
  }

  const adminFilter = encodeURIComponent('role = "admin"');
  const admins = await request(
    `/api/collections/users/records?perPage=1&skipTotal=false&filter=${adminFilter}`,
    { headers: authHeaders },
  );

  if (!admins.response.ok) {
    throw new Error("Could not count MiniKB administrators.");
  }

  const stamp = Date.now();
  const temporaryPassword = `Tmp!${stamp}Aa`;
  const anonymousAttempt = await request("/api/collections/users/records", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `security-check-${stamp}@example.invalid`,
      password: temporaryPassword,
      passwordConfirm: temporaryPassword,
      role: "admin",
    }),
  });

  if (anonymousAttempt.response.ok) {
    if (anonymousAttempt.data.id) {
      await request(`/api/collections/users/records/${anonymousAttempt.data.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
    }
    throw new Error("Anonymous account creation unexpectedly succeeded.");
  }

  console.log("createRule=admin-only");
  console.log("updateRule=self-role-protected");
  console.log(
    `anonymousRegistration=denied status=${anonymousAttempt.response.status}`,
  );
  console.log(`adminCount=${admins.data.totalItems}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
