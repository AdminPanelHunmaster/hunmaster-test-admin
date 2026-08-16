import type { AppRole, Profile } from "@/lib/supabase/database.types";

export const ADMIN_ROLES: readonly AppRole[] = ["admin", "owner"];

export function isAdminRole(role: AppRole | null | undefined): boolean {
  return role === "admin" || role === "owner";
}

export function isOwnerRole(role: AppRole | null | undefined): boolean {
  return role === "owner";
}

export function canManageRole(actor: AppRole, target: AppRole): boolean {
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "owner";
  return false;
}

export function assertAdminProfile(profile: Profile | null): Profile {
  if (!profile || !profile.is_active || !isAdminRole(profile.role)) {
    throw new Error("Administrator access is required.");
  }

  return profile;
}
