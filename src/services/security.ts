import { z } from "zod";
import { SOURCE_SECURITY_AUDIT } from "@/generated/source-security-audit";
import { supabase } from "@/lib/supabase/client";
import type { AuditLog, Profile } from "@/lib/supabase/database.types";
import { AdminBackendError, toAdminBackendError } from "./errors";

const emergencySchema = z
  .object({
    emergencyMode: z.boolean().default(false),
    incidentStartedAt: z.string().nullable().optional(),
    incidentStartedBy: z.string().uuid().nullable().optional(),
    incidentReason: z.string().nullable().optional(),
    incidentComment: z.string().nullable().optional(),
    deployment: z.string().nullable().optional(),
    restrictions: z.array(z.string()).optional(),
  })
  .passthrough();

const overviewSchema = z.object({
  emergency: emergencySchema,
  database: z.object({
    publicTableCount: z.number().int().nonnegative(),
    unprotectedTables: z.array(z.string()),
    anonymousUnrestrictedWrites: z.number().int().nonnegative(),
    anonymousSecurityDefinerFunctions: z.number().int().nonnegative(),
    mutableAuditPolicies: z.number().int().nonnegative(),
  }),
  authentication: z.object({
    activeAdminCount: z.number().int().nonnegative(),
    activeOwnerCount: z.number().int().nonnegative(),
    currentUserSessions: z.number().int().nonnegative(),
    platformSessions: z.number().int().nonnegative().nullable(),
    verifiedMfaFactors: z.number().int().nonnegative(),
    currentAal: z.string(),
  }),
  lastSecurityAuditAt: z.string().nullable(),
  checkedAt: z.string(),
});

const sessionSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
  refreshedAt: z.string().nullable(),
  notAfter: z.string().nullable(),
  aal: z.string().nullable(),
  userAgent: z.string().nullable(),
  isCurrent: z.boolean(),
});

export type SecurityOverview = z.infer<typeof overviewSchema>;
export type SecuritySession = z.infer<typeof sessionSchema>;
export type EmergencyReason =
  | "suspected_compromise"
  | "suspicious_activity"
  | "credential_leak"
  | "traffic_attack"
  | "unknown"
  | "other"
  | "resolved";

export type MfaStatus = {
  verifiedFactors: Array<{ id: string; friendlyName: string | null; type: string }>;
  currentLevel: string | null;
  nextLevel: string | null;
};

export async function getSecurityOverview(): Promise<SecurityOverview> {
  const { data, error } = await supabase.rpc("security_get_overview", {});
  if (error) throw toAdminBackendError(error, "Не удалось выполнить проверку безопасности.");
  return overviewSchema.parse(data);
}

export async function getSecuritySessions(): Promise<SecuritySession[]> {
  const { data, error } = await supabase.rpc("security_get_my_sessions", {});
  if (error) throw toAdminBackendError(error, "Не удалось загрузить активные сессии.");
  return z.array(sessionSchema).parse(data);
}

export async function getSecurityEvents(): Promise<AuditLog[]> {
  const { data, error } = await supabase
    .from("admin_audit_log")
    .select("id,admin_id,action,entity_type,entity_id,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw toAdminBackendError(error, "Не удалось загрузить security events.");
  return data ?? [];
}

export async function getAdminAccounts(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("role", ["admin", "owner"])
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw toAdminBackendError(error, "Не удалось загрузить администраторов.");
  return data ?? [];
}

export async function runSecurityAudit(): Promise<void> {
  const { error } = await supabase.rpc("security_run_audit", {
    p_source_secret_findings: SOURCE_SECURITY_AUDIT.committedSecretFindings.length,
    p_client_secret_env_findings: SOURCE_SECURITY_AUDIT.clientSecretEnvFindings.length,
  });
  if (error) throw toAdminBackendError(error, "Не удалось завершить security audit.");
}

export async function setEmergencyMode(input: {
  enabled: boolean;
  reason: EmergencyReason;
  comment: string;
}): Promise<void> {
  const { error } = await supabase.rpc("security_set_emergency_mode", {
    p_enabled: input.enabled,
    p_reason: input.reason,
    p_comment: input.comment,
    p_deployment: `${__HUNMASTER_ENVIRONMENT__}:${__HUNMASTER_DEPLOYMENT__}`,
  });
  if (error) throw toAdminBackendError(error, "Не удалось изменить Emergency Mode.");
}

export async function revokeOwnSession(sessionId: string): Promise<number> {
  const { data, error } = await supabase.rpc("security_revoke_my_session", {
    p_session_id: sessionId,
  });
  if (error) throw toAdminBackendError(error, "Не удалось завершить сессию.");
  return data;
}

export async function revokePlatformSessions(
  scope: "all" | "except_current_owner",
): Promise<number> {
  const { data, error } = await supabase.rpc("security_revoke_platform_sessions", {
    p_scope: scope,
  });
  if (error) throw toAdminBackendError(error, "Не удалось завершить сессии.");
  return data;
}

export async function getMfaStatus(): Promise<MfaStatus> {
  const [factorsResult, aalResult] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  if (factorsResult.error) {
    throw toAdminBackendError(factorsResult.error, "Не удалось проверить MFA.");
  }
  if (aalResult.error) throw toAdminBackendError(aalResult.error, "Не удалось проверить AAL.");

  return {
    verifiedFactors: factorsResult.data.all
      .filter((factor) => factor.status === "verified")
      .map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name ?? null,
        type: factor.factor_type,
      })),
    currentLevel: aalResult.data.currentLevel,
    nextLevel: aalResult.data.nextLevel,
  };
}

export async function startTotpEnrollment(): Promise<{ factorId: string; qrCode: string }> {
  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw toAdminBackendError(factors.error, "Не удалось проверить MFA.");
  for (const factor of factors.data.all.filter((item) => item.status === "unverified")) {
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) throw toAdminBackendError(error, "Не удалось очистить незавершённую MFA.");
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "HunMaster Admin",
  });
  if (error) throw toAdminBackendError(error, "Не удалось начать настройку MFA.");
  return { factorId: data.id, qrCode: data.totp.qr_code };
}

export async function verifyTotp(factorId: string, code: string): Promise<void> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw toAdminBackendError(error, "Неверный код MFA.");
}

export async function performElevatedReauthentication(
  password: string,
  otp?: string,
): Promise<void> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  const email = userResult.user?.email;
  if (userError || !email) throw new AdminBackendError("Не удалось подтвердить текущий аккаунт.");

  const { error: passwordError } = await supabase.auth.signInWithPassword({ email, password });
  if (passwordError) throw new AdminBackendError("Повторная аутентификация не пройдена.");

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) throw toAdminBackendError(factors.error, "Не удалось проверить MFA.");
  const verified = factors.data.all.find(
    (factor) => factor.status === "verified" && factor.factor_type === "totp",
  );
  if (!verified) return;
  if (!otp?.trim()) throw new AdminBackendError("Введите код MFA из приложения-аутентификатора.");

  const { error: otpError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: verified.id,
    code: otp.trim(),
  });
  if (otpError) throw new AdminBackendError("Неверный код MFA.");
}

export const sourceSecurityAudit = SOURCE_SECURITY_AUDIT;
export const securityBuild = {
  deployment: __HUNMASTER_DEPLOYMENT__,
  environment: __HUNMASTER_ENVIRONMENT__,
  gitSha: __HUNMASTER_GIT_SHA__,
};
