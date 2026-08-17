import { createClient } from "@supabase/supabase-js";

function normalizePublicEnv(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.replace(/^\uFEFF/, "").trim();
  return normalized.length > 0 ? normalized : undefined;
}

const supabaseUrl = normalizePublicEnv(import.meta.env["VITE_SUPABASE_URL"]);
const supabaseAnonKey = normalizePublicEnv(import.meta.env["VITE_SUPABASE_ANON_KEY"]);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl ?? "https://missing.supabase.co",
  supabaseAnonKey ?? "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
