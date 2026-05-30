import { POCKETBASE_URL } from "@/lib/pocketbase/config";
import type {
  PocketBaseError,
  PocketBaseList,
  RawPocketBaseRecord,
  UserProfile,
} from "@/lib/pocketbase/types";

type RequestOptions = RequestInit & {
  token?: string | null;
};

export function normalizeRecord<T extends RawPocketBaseRecord>(
  record: T
): T & { created_at: string; updated_at: string } {
  const createdAt = record.created_at ?? record.created ?? "";
  const updatedAt = record.updated_at ?? record.updated ?? createdAt;

  return {
    ...record,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

function roleValue(value: unknown): UserProfile["role"] {
  return value === "admin" || value === "editor" || value === "viewer"
    ? value
    : "viewer";
}

export function normalizeUser(record: RawPocketBaseRecord): UserProfile {
  const normalized = normalizeRecord(record);

  return {
    ...normalized,
    email: stringValue(normalized.email),
    full_name: stringValue(normalized.full_name) ?? stringValue(normalized.name),
    role: roleValue(normalized.role),
  };
}

export function escapeFilterValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function pbRequest<T>(
  path: string,
  { token, headers, ...init }: RequestOptions = {}
): Promise<T> {
  const response = await fetch(`${POCKETBASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `PocketBase request failed (${response.status})`;

    try {
      const body = await response.json();
      message = [
        body.message || message,
        body.data ? JSON.stringify(body.data, null, 2) : "",
      ]
        .filter(Boolean)
        .join("\n");
    } catch {
      // Keep the status-based message when PocketBase does not return JSON.
    }

    const error = new Error(message) as PocketBaseError;
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function listRecords<T extends RawPocketBaseRecord>(
  collection: string,
  params: URLSearchParams,
  token?: string | null
) {
  const data = await pbRequest<PocketBaseList<T>>(
    `/api/collections/${collection}/records?${params.toString()}`,
    { token }
  );

  return {
    ...data,
    items: data.items.map((item) => normalizeRecord(item)),
  };
}
