import { POCKETBASE_AUTH_COOKIE } from "@/lib/pocketbase/config";
import type { PocketBaseAuth } from "@/lib/pocketbase/types";

export function parseAuthCookie(value?: string | null): PocketBaseAuth | null {
  if (!value) return null;

  try {
    return JSON.parse(decodeURIComponent(value)) as PocketBaseAuth;
  } catch {
    return null;
  }
}

export function serializeAuthCookie(auth: PocketBaseAuth) {
  return encodeURIComponent(JSON.stringify(auth));
}

export function getBrowserAuth(): PocketBaseAuth | null {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${POCKETBASE_AUTH_COOKIE}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  return parseAuthCookie(value);
}

export function saveBrowserAuth(auth: PocketBaseAuth) {
  if (typeof document === "undefined") return;

  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${POCKETBASE_AUTH_COOKIE}=${serializeAuthCookie(
    auth
  )}; Path=/; Max-Age=1209600; SameSite=Lax${secure}`;
}

export function clearBrowserAuth() {
  if (typeof document === "undefined") return;

  document.cookie = `${POCKETBASE_AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
