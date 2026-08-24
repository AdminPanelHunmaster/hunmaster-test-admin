import { createClient } from "@supabase/supabase-js";

function normalizePublicEnv(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.replace(/^\uFEFF/, "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

const HUNMASTER_SUPABASE_URL = "https://lthzuqejupoanyblalmy.supabase.co";
const supabaseUrl = normalizePublicEnv(import.meta.env["VITE_SUPABASE_URL"])?.replace(/\/+$/, "");
const supabasePublicKey =
  normalizePublicEnv(import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) ??
  normalizePublicEnv(import.meta.env["VITE_SUPABASE_ANON_KEY"]);

export const supabaseConfigurationError = !supabaseUrl
  ? "Не задан VITE_SUPABASE_URL."
  : supabaseUrl !== HUNMASTER_SUPABASE_URL
    ? "Admin Panel подключён не к общему Supabase HunMaster."
    : !supabasePublicKey
      ? "Не задан VITE_SUPABASE_PUBLISHABLE_KEY или VITE_SUPABASE_ANON_KEY."
      : null;

export const isSupabaseConfigured = supabaseConfigurationError === null;

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl! : HUNMASTER_SUPABASE_URL,
  supabasePublicKey ?? "missing-public-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
