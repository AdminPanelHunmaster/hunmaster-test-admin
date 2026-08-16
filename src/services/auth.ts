import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/database.types";
import { toAdminBackendError } from "./errors";

export type AuthSnapshot = {
  user: User | null;
  profile: Profile | null;
};

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw toAdminBackendError(error, "Не удалось загрузить профиль.");
  return data;
}

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw toAdminBackendError(error, "Не удалось восстановить сессию.");

  const user = data.session?.user ?? null;
  if (!user) return { user: null, profile: null };

  return { user, profile: await getProfile(user.id) };
}

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw toAdminBackendError(error, "Неверный email или пароль.");
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toAdminBackendError(error, "Не удалось выйти.");
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  if (error) throw toAdminBackendError(error, "Не удалось отправить письмо восстановления.");
}

export async function touchLastSeen(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) throw toAdminBackendError(error, "Не удалось обновить активность.");
}
