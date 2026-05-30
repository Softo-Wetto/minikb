import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/pocketbase/server";

export async function requireUser() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentProfile() {
  return getServerUser();
}

export async function requireEditor() {
  const profile = await getCurrentProfile();

  if (!profile || !["admin", "editor"].includes(profile.role)) {
    redirect("/");
  }

  return profile;
}

export async function requireAdmin() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return profile;
}
