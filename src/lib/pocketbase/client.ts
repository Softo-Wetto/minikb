"use client";

import {
  clearBrowserAuth,
  getBrowserAuth,
  saveBrowserAuth,
} from "@/lib/pocketbase/auth-cookie";
import {
  listRecords,
  normalizeRecord,
  normalizeUser,
  pbRequest as basePbRequest,
} from "@/lib/pocketbase/shared";
import type { PocketBaseAuth } from "@/lib/pocketbase/types";
import type { RawPocketBaseRecord } from "@/lib/pocketbase/types";

async function pbRequest<T>(
  path: string,
  options: Parameters<typeof basePbRequest<T>>[1] = {}
) {
  try {
    return await basePbRequest<T>(path, options);
  } catch (error) {
    const status = error instanceof Error && "status" in error
      ? (error as { status?: number }).status
      : undefined;

    if (status === 401 || status === 403) {
      clearBrowserAuth();
    }

    throw error;
  }
}

export async function signInWithPassword(email: string, password: string) {
  const response = await pbRequest<{ token: string; record: RawPocketBaseRecord }>(
    "/api/collections/users/auth-with-password",
    {
      method: "POST",
      body: JSON.stringify({ identity: email, password }),
    }
  );

  const auth: PocketBaseAuth = {
    token: response.token,
    user: normalizeUser(response.record),
  };

  saveBrowserAuth(auth);
  return auth;
}

export async function signUpWithPassword(email: string, password: string) {
  const record = await pbRequest<RawPocketBaseRecord>(
    "/api/collections/users/records",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        passwordConfirm: password,
        role: "viewer",
      }),
    }
  );

  return normalizeUser(record);
}

export function signOut() {
  clearBrowserAuth();
}

export function getCurrentAuth() {
  return getBrowserAuth();
}

export async function createRecord<T extends RawPocketBaseRecord>(
  collection: string,
  data: Record<string, unknown>
) {
  const auth = getBrowserAuth();
  const record = await pbRequest<T>(`/api/collections/${collection}/records`, {
    method: "POST",
    token: auth?.token,
    body: JSON.stringify(data),
  });

  return normalizeRecord(record);
}

export async function updateRecord<T extends RawPocketBaseRecord>(
  collection: string,
  id: string,
  data: Record<string, unknown>
) {
  const auth = getBrowserAuth();
  const record = await pbRequest<T>(`/api/collections/${collection}/records/${id}`, {
    method: "PATCH",
    token: auth?.token,
    body: JSON.stringify(data),
  });

  return normalizeRecord(record);
}

export async function createAttachment({
  articleId,
  assetId,
  file,
}: {
  articleId?: string;
  assetId?: string;
  file: File;
}) {
  const auth = getBrowserAuth();
  if (!auth) {
    throw new Error("Not logged in");
  }

  const formData = new FormData();
  if (articleId) formData.append("article_id", articleId);
  if (assetId) formData.append("asset_id", assetId);
  formData.append("file", file);
  formData.append("file_name", file.name);
  formData.append("file_path", file.name);
  formData.append("file_size", String(file.size));
  formData.append("mime_type", file.type || "");
  formData.append("uploaded_by", auth.user.id);

  const record = await pbRequest<RawPocketBaseRecord>(
    "/api/collections/attachments/records",
    {
      method: "POST",
      token: auth.token,
      body: formData,
    }
  );

  return normalizeRecord(record);
}

export async function getClientRecords<T extends RawPocketBaseRecord>(
  collection: string,
  params: URLSearchParams
) {
  const auth = getBrowserAuth();
  return listRecords<T>(collection, params, auth?.token);
}
