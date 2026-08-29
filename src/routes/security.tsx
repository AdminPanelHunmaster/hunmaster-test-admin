import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArchiveRestore,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Fingerprint,
  Gauge,
  KeyRound,
  Laptop,
  Loader2,
  LockKeyhole,
  Network,
  RefreshCw,
  ScanSearch,
  ServerCog,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";
import { evaluateSecurityStatus } from "@/features/security/security-status";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/services/errors";
import { isOwnerRole } from "@/services/permissions";
import {
  getAdminAccounts,
  getMfaStatus,
  getSecurityEvents,
  getSecurityOverview,
  getSecuritySessions,
  performElevatedReauthentication,
  revokeOwnSession,
  revokePlatformSessions,
  runSecurityAudit,
  securityBuild,
  setEmergencyMode,
  sourceSecurityAudit,
  startTotpEnrollment,
  verifyTotp,
  type EmergencyReason,
  type SecuritySession,
} from "@/services/security";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Безопасность — HunMaster Admin" },
      {
        name: "description",
        content: "Security Center, MFA, sessions and Emergency Mode for HunMaster.",
      },
    ],
  }),
  component: SecurityPage,
});

const reasons: Array<{ value: EmergencyReason; label: string }> = [
  { value: "suspected_compromise", label: "Подозрение на взлом" },
  { value: "suspicious_activity", label: "Подозрительная активность" },
  { value: "credential_leak", label: "Credential leak" },
  { value: "traffic_attack", label: "DDoS / traffic attack" },
  { value: "unknown", label: "Неизвестная проблема" },
  { value: "other", label: "Другое" },
];

const eventLabels: Record<string, string> = {
  "security.incident_started": "Аварийный режим активирован",
  "security.incident_resolved": "Инцидент закрыт",
  "security.audit_completed": "Проверка безопасности завершена",
  "security.session_revoke_requested": "Сессия завершена",
  "security.platform_sessions_revoked": "Сессии платформы отозваны",
  "user.role_changed": "Роль пользователя изменена",
  "user.access_restricted": "Доступ пользователя ограничен",
  "user.access_restored": "Доступ пользователя восстановлен",
  "access.granted": "Доступ к курсу выдан",
  "access.revoked": "Доступ к курсу отозван",
  "lesson.published": "Урок опубликован",
  "lesson.unpublished": "Урок снят с публикации",
  "course.published": "Курс опубликован",
  "course.unpublished": "Курс снят с публикации",
};

type ElevatedAction =
  | { kind: "enable" }
  | { kind: "disable" }
  | { kind: "revoke-session"; session: SecuritySession }
  | { kind: "revoke-platform"; scope: "all" | "except_current_owner" };

function formatTime(value: string | null | undefined) {
  if (!value) return "Недоступно";
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function maskId(value: string) {
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function severityFor(action: string): "INFO" | "WARNING" | "CRITICAL" {
  if (action === "security.incident_started") return "CRITICAL";
  if (
    action.includes("revoked") ||
    action.includes("restricted") ||
    action.includes("role_changed") ||
    action.includes("unpublished")
  ) {
    return "WARNING";
  }
  return "INFO";
}

function StatusPill({
  tone,
  children,
}: {
  tone: "safe" | "warning" | "danger" | "muted";
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase",
        tone === "safe" && "border-jade/35 bg-jade/10 text-jade",
        tone === "warning" && "border-ember/35 bg-ember/10 text-ember",
        tone === "danger" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "muted" && "border-border bg-foreground/[0.04] text-muted-foreground",
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  tone = "safe",
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  detail: string;
  tone?: "safe" | "warning" | "danger" | "muted";
}) {
  return (
    <GlassCard interactive={false} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-foreground/[0.04]">
          <Icon className="h-4 w-4 text-ember" />
        </div>
        <StatusPill tone={tone}>{value}</StatusPill>
      </div>
      <p className="mt-4 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail}</p>
    </GlassCard>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="glass-panel h-40 animate-pulse rounded-2xl" />
      ))}
    </div>
  );
}

function ElevatedDialog({
  action,
  mfaRequired,
  onClose,
  onComplete,
}: {
  action: ElevatedAction | null;
  mfaRequired: boolean;
  onClose: () => void;
  onComplete: (input: {
    password: string;
    otp: string;
    phrase: string;
    reason: EmergencyReason;
    comment: string;
  }) => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [phrase, setPhrase] = useState("");
  const [reason, setReason] = useState<EmergencyReason>("suspected_compromise");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!action) return null;
  const isEnable = action.kind === "enable";
  const isDisable = action.kind === "disable";
  const requiredPhrase = isEnable ? "EMERGENCY" : isDisable ? "RESOLVE" : "REVOKE";
  const title = isEnable
    ? "Активировать аварийный режим"
    : isDisable
      ? "Завершить аварийный режим"
      : "Подтвердить отзыв сессий";

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await onComplete({ password, otp, phrase, reason, comment });
      setPassword("");
      setOtp("");
      onClose();
    } catch (submitError) {
      setPassword("");
      setError(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <button
          aria-label="Закрыть"
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          className="glass-panel relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-destructive/40 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <h2 className="font-display mt-4 text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Действие проверяется повторной аутентификацией и серверной owner/admin authorization.
            Пароль и MFA-код не сохраняются и не попадают в audit log.
          </p>

          <div className="mt-5 grid gap-4">
            {isEnable && (
              <label className="grid gap-2">
                <span className="metadata-label">Причина инцидента</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value as EmergencyReason)}
                  className="lesson-filter"
                >
                  {reasons.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(isEnable || isDisable) && (
              <label className="grid gap-2">
                <span className="metadata-label">
                  {isDisable ? "Комментарий о разрешении инцидента" : "Комментарий"}
                </span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder={
                    isDisable
                      ? "Что проверено и почему режим можно завершить"
                      : "Контекст без секретов и credentials"
                  }
                  className="rounded-xl border border-border bg-background/30 px-3 py-2.5 text-sm outline-none focus:border-ember/40"
                />
              </label>
            )}
            <label className="grid gap-2">
              <span className="metadata-label">Текущий пароль</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="lesson-filter"
              />
            </label>
            {mfaRequired && (
              <label className="grid gap-2">
                <span className="metadata-label">Код MFA</span>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 8))}
                  className="lesson-filter font-mono tracking-[0.35em]"
                />
              </label>
            )}
            <label className="grid gap-2">
              <span className="metadata-label">
                Введите {requiredPhrase}, чтобы разблокировать подтверждение
              </span>
              <input
                value={phrase}
                onChange={(event) => setPhrase(event.target.value)}
                autoComplete="off"
                className="lesson-filter font-mono"
              />
            </label>
            {error && (
              <p className="rounded-xl border border-destructive/35 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button onClick={onClose} disabled={busy} className="editor-button">
              Отмена
            </button>
            <button
              disabled={
                busy ||
                !password ||
                phrase !== requiredPhrase ||
                (mfaRequired && otp.length < 6) ||
                (isDisable && comment.trim().length < 10)
              }
              onClick={() => void submit()}
              className="flex h-10 items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/20 px-4 text-xs font-bold text-destructive transition-colors hover:bg-destructive/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Подтвердить
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function MfaPanel({ enabled, onChanged }: { enabled: boolean; onChanged: () => Promise<void> }) {
  const [enrollment, setEnrollment] = useState<{ factorId: string; qrCode: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnrollment(await startTotpEnrollment());
    } catch (startError) {
      setError(getErrorMessage(startError));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!enrollment) return;
    setBusy(true);
    setError(null);
    try {
      await verifyTotp(enrollment.factorId, code);
      setEnrollment(null);
      setCode("");
      await onChanged();
      toast.success("MFA включена. Другие сессии Supabase завершены.");
    } catch (verifyError) {
      setError(getErrorMessage(verifyError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard interactive={false} className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-ember" />
            <h2 className="font-display text-sm font-semibold">Two-factor authentication</h2>
          </div>
          <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">
            Supabase TOTP. Для owner MFA настоятельно рекомендуется; после настройки sensitive
            actions требуют AAL2.
          </p>
        </div>
        <StatusPill tone={enabled ? "safe" : "warning"}>
          {enabled ? "Включена" : "Не включена"}
        </StatusPill>
      </div>
      {!enabled && !enrollment && (
        <button onClick={() => void begin()} disabled={busy} className="editor-button mt-4">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Настроить TOTP
        </button>
      )}
      {enrollment && (
        <div className="mt-5 grid gap-5 rounded-2xl border border-ember/25 bg-background/30 p-4 sm:grid-cols-[180px_1fr]">
          <div className="rounded-xl bg-white p-3">
            <img
              src={enrollment.qrCode}
              alt="QR-код настройки TOTP"
              className="aspect-square w-full"
            />
          </div>
          <div>
            <p className="text-sm font-semibold">Отсканируйте QR-код</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Добавьте HunMaster Admin в приложение-аутентификатор, затем введите одноразовый код.
              Enrollment secret нигде не сохраняется приложением.
            </p>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="lesson-filter mt-4 font-mono tracking-[0.3em]"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => void verify()}
                disabled={busy || code.length < 6}
                className="editor-button border-ember/30 text-foreground"
              >
                Подтвердить MFA
              </button>
              <button onClick={() => setEnrollment(null)} disabled={busy} className="editor-button">
                Позже
              </button>
            </div>
          </div>
        </div>
      )}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </GlassCard>
  );
}

function SecurityPage() {
  const { user, profile, logout } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = isOwnerRole(profile?.role);
  const [elevatedAction, setElevatedAction] = useState<ElevatedAction | null>(null);

  const overviewQuery = useQuery({
    queryKey: ["security", "overview", user?.id],
    queryFn: getSecurityOverview,
    enabled: Boolean(user && profile),
    refetchInterval: 30_000,
  });
  const sessionsQuery = useQuery({
    queryKey: ["security", "sessions", user?.id],
    queryFn: getSecuritySessions,
    enabled: Boolean(user && profile),
  });
  const eventsQuery = useQuery({
    queryKey: ["security", "events", user?.id],
    queryFn: getSecurityEvents,
    enabled: Boolean(user && profile),
  });
  const adminsQuery = useQuery({
    queryKey: ["security", "admins", user?.id],
    queryFn: getAdminAccounts,
    enabled: Boolean(user && profile),
  });
  const mfaQuery = useQuery({
    queryKey: ["security", "mfa", user?.id],
    queryFn: getMfaStatus,
    enabled: Boolean(user),
  });

  const auditMutation = useMutation({
    mutationFn: runSecurityAudit,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["security"] });
      toast.success("Security audit завершён по реальным schema/source checks.");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });

  const overview = overviewQuery.data;
  const emergency = Boolean(overview?.emergency.emergencyMode);
  const mfaEnabled = (mfaQuery.data?.verifiedFactors.length ?? 0) > 0;
  const status = overview
    ? evaluateSecurityStatus({
        emergencyMode: emergency,
        unprotectedTableCount: overview.database.unprotectedTables.length,
        anonymousUnrestrictedWrites: overview.database.anonymousUnrestrictedWrites,
        anonymousSecurityDefinerFunctions: overview.database.anonymousSecurityDefinerFunctions,
        mutableAuditPolicies: overview.database.mutableAuditPolicies,
        activeOwnerCount: overview.authentication.activeOwnerCount,
        ownerMfaMissing: isOwner && !mfaEnabled,
        sourceFindingCount:
          sourceSecurityAudit.committedSecretFindings.length +
          sourceSecurityAudit.clientSecretEnvFindings.length,
        // Supabase's provider audit currently reports leaked-password protection disabled.
        providerAuthHardeningVerified: false,
      })
    : "Attention Required";
  const hasAttention = status === "Attention Required";
  const statusTone = emergency ? "danger" : hasAttention ? "warning" : "safe";

  const securityEvents = useMemo(
    () =>
      (eventsQuery.data ?? []).filter(
        (event) => eventLabels[event.action] || event.action.startsWith("security."),
      ),
    [eventsQuery.data],
  );

  const refreshSecurity = async () => {
    await queryClient.invalidateQueries({ queryKey: ["security"] });
  };

  const completeElevatedAction = async (input: {
    password: string;
    otp: string;
    phrase: string;
    reason: EmergencyReason;
    comment: string;
  }) => {
    if (!elevatedAction) return;
    await performElevatedReauthentication(input.password, input.otp);

    if (elevatedAction.kind === "enable") {
      await setEmergencyMode({ enabled: true, reason: input.reason, comment: input.comment });
      toast.success("Emergency Mode активирован. Critical mutations заблокированы в PostgreSQL.");
    } else if (elevatedAction.kind === "disable") {
      await setEmergencyMode({ enabled: false, reason: "resolved", comment: input.comment });
      toast.success("Emergency Mode завершён, incident resolution записан.");
    } else if (elevatedAction.kind === "revoke-session") {
      const wasCurrent = elevatedAction.session.isCurrent;
      await revokeOwnSession(elevatedAction.session.id);
      toast.success("Сессия завершена.");
      if (wasCurrent) await logout();
    } else {
      const deleted = await revokePlatformSessions(elevatedAction.scope);
      toast.success(`Отозвано refresh-сессий: ${deleted}.`);
      if (elevatedAction.scope === "all") await logout();
    }
    await refreshSecurity();
  };

  return (
    <AdminLayout title="Безопасность" subtitle="Security posture, containment и recovery HunMaster">
      {overviewQuery.isLoading ? (
        <LoadingState />
      ) : overviewQuery.error || !overview ? (
        <GlassCard interactive={false} className="p-6">
          <ShieldAlert className="h-6 w-6 text-destructive" />
          <h2 className="mt-4 font-semibold">Security Center недоступен</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(overviewQuery.error, "Не удалось получить проверяемое состояние.")}
          </p>
          <button onClick={() => void overviewQuery.refetch()} className="editor-button mt-4">
            Повторить
          </button>
        </GlassCard>
      ) : (
        <div className="grid gap-5">
          <GlassCard
            interactive={false}
            className={cn(
              "overflow-hidden p-5 sm:p-6",
              emergency && "border-destructive/40 bg-destructive/[0.055]",
            )}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "grid h-14 w-14 shrink-0 place-items-center rounded-2xl border",
                    statusTone === "safe" && "border-jade/35 bg-jade/10 text-jade",
                    statusTone === "warning" && "border-ember/35 bg-ember/10 text-ember",
                    statusTone === "danger" &&
                      "border-destructive/45 bg-destructive/10 text-destructive",
                  )}
                >
                  {emergency ? (
                    <ShieldAlert className="h-6 w-6" />
                  ) : (
                    <ShieldCheck className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-xl font-semibold">Security Status</h2>
                    <StatusPill tone={statusTone}>{status}</StatusPill>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    {emergency
                      ? "Containment активен: критичные изменения остановлены в database/RLS, чтение опубликованных уроков и student progress остаются доступны."
                      : hasAttention
                        ? "Базовая защита активна, но есть проверяемые рекомендации, требующие внимания owner."
                        : "Все доступные автоматические checks пройдены."}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Проверено {formatTime(overview.checkedAt)} · deployment{" "}
                    {securityBuild.deployment}
                  </p>
                </div>
              </div>
              <button
                onClick={() => auditMutation.mutate()}
                disabled={auditMutation.isPending}
                className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-ember/35 bg-ember/10 px-4 text-xs font-semibold text-ember transition-colors hover:bg-ember/15 disabled:opacity-50"
              >
                {auditMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanSearch className="h-4 w-4" />
                )}
                Запустить проверку безопасности
              </button>
            </div>
          </GlassCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Database}
              title="Database Protection"
              value={overview.database.unprotectedTables.length === 0 ? "RLS ON" : "Проблема"}
              detail={`${overview.database.publicTableCount} public tables; без RLS: ${overview.database.unprotectedTables.length}.`}
              tone={overview.database.unprotectedTables.length === 0 ? "safe" : "danger"}
            />
            <MetricCard
              icon={LockKeyhole}
              title="Authentication"
              value={
                mfaEnabled ? `AAL ${mfaQuery.data?.currentLevel?.slice(-1) ?? "2"}` : "MFA OFF"
              }
              detail="Пароли обрабатывает только Supabase Auth; Admin их не хранит и не просматривает."
              tone={mfaEnabled ? "safe" : "warning"}
            />
            <MetricCard
              icon={Laptop}
              title="Active Sessions"
              value={String(overview.authentication.currentUserSessions)}
              detail={
                isOwner && overview.authentication.platformSessions != null
                  ? `По платформе: ${overview.authentication.platformSessions}. IP не отображаются.`
                  : "Показаны только сессии текущего администратора."
              }
              tone="safe"
            />
            <MetricCard
              icon={UsersRound}
              title="Admin Accounts"
              value={`${overview.authentication.activeOwnerCount} owner`}
              detail={`Активных admin: ${overview.authentication.activeAdminCount}. Role source: profiles + DB triggers.`}
              tone={overview.authentication.activeOwnerCount === 1 ? "safe" : "warning"}
            />
            <MetricCard
              icon={Activity}
              title="Recent Security Events"
              value={String(securityEvents.length)}
              detail="Append-only audit view; редактирование и удаление из frontend запрещены."
              tone={
                securityEvents.some((event) => severityFor(event.action) === "CRITICAL")
                  ? "warning"
                  : "safe"
              }
            />
            <MetricCard
              icon={Network}
              title="DDoS Protection"
              value="Vercel Auto"
              detail="Automatic DDoS mitigation и system traffic filtering; Attack Mode включается только вручную на инцидент."
              tone="safe"
            />
            <MetricCard
              icon={Gauge}
              title="Rate Limiting"
              value="Provider"
              detail="Supabase Auth применяет provider limits. Точные project thresholds через доступный API недоступны."
              tone="muted"
            />
            <MetricCard
              icon={ArchiveRestore}
              title="Backups"
              value="Недоступно"
              detail="Последний managed backup не выдаётся доступным API; статус не подменяется фиктивным числом."
              tone="muted"
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <GlassCard
              interactive={false}
              className={cn("p-5 sm:p-6", emergency && "border-destructive/40")}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    {emergency ? (
                      <ShieldOff className="h-5 w-5 text-destructive" />
                    ) : (
                      <Shield className="h-5 w-5 text-ember" />
                    )}
                    <h2 className="font-display text-base font-semibold">
                      Emergency Security Mode
                    </h2>
                  </div>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Containment, не self-destruct: данные не удаляются, пароли не меняются, база не
                    «перешифровывается».
                  </p>
                </div>
                <StatusPill tone={emergency ? "danger" : "safe"}>
                  {emergency ? "Активен" : "Выключен"}
                </StatusPill>
              </div>

              {emergency && (
                <div className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/[0.07] p-4">
                  <p className="text-sm font-semibold text-destructive">
                    Incident containment активен
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Начат: {formatTime(overview.emergency.incidentStartedAt)} · причина:{" "}
                    {overview.emergency.incidentReason ?? "—"}
                  </p>
                  {overview.emergency.incidentComment && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {overview.emergency.incidentComment}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  "lesson/course mutations",
                  "enrollment grant/revoke",
                  "role и security profile changes",
                  "platform settings",
                  "registration profile creation",
                  "media uploads/deletes",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-xl border border-border bg-foreground/[0.025] px-3 py-2 text-xs"
                  >
                    <LockKeyhole className="h-3.5 w-3.5 text-ember" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-jade/20 bg-jade/[0.04] px-4 py-3 text-xs leading-5 text-muted-foreground">
                <span className="font-semibold text-jade">Остаётся доступно:</span> authenticated
                read опубликованных courses/lessons/blocks, existing enrollments и запись lesson
                progress.
              </div>

              {isOwner ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {!emergency ? (
                    <button
                      onClick={() => setElevatedAction({ kind: "enable" })}
                      className="flex h-11 items-center gap-2 rounded-xl border border-destructive/50 bg-destructive/15 px-4 text-xs font-bold text-destructive transition-colors hover:bg-destructive/25"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Активировать аварийный режим
                    </button>
                  ) : (
                    <button
                      onClick={() => setElevatedAction({ kind: "disable" })}
                      className="flex h-11 items-center gap-2 rounded-xl border border-jade/35 bg-jade/10 px-4 text-xs font-bold text-jade transition-colors hover:bg-jade/15"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Завершить аварийный режим
                    </button>
                  )}
                </div>
              ) : (
                <p className="mt-5 rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-xs text-muted-foreground">
                  Admin может наблюдать состояние. Активация и recovery доступны только owner.
                </p>
              )}
            </GlassCard>

            <GlassCard interactive={false} className="p-5">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-ember" />
                <h2 className="font-display text-sm font-semibold">Last Security Audit</h2>
              </div>
              <p className="mt-4 text-xl font-semibold">
                {formatTime(overview.lastSecurityAuditAt)}
              </p>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                <p>Source files checked: {sourceSecurityAudit.scannedFiles}</p>
                <p>
                  Committed secret-like findings:{" "}
                  {sourceSecurityAudit.committedSecretFindings.length}
                </p>
                <p>
                  Client secret env findings: {sourceSecurityAudit.clientSecretEnvFindings.length}
                </p>
                <p>
                  Anonymous unrestricted writes: {overview.database.anonymousUnrestrictedWrites}
                </p>
                <p>
                  Anonymous SECURITY DEFINER RPC:{" "}
                  {overview.database.anonymousSecurityDefinerFunctions}
                </p>
              </div>
              <p className="mt-4 break-all text-[10px] text-muted-foreground">
                Git {securityBuild.gitSha}
              </p>
            </GlassCard>
          </div>

          <MfaPanel enabled={mfaEnabled} onChanged={refreshSecurity} />

          <div className="grid gap-5 xl:grid-cols-2">
            <GlassCard interactive={false} className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-ember" />
                  <h2 className="font-display text-sm font-semibold">Active Sessions</h2>
                </div>
                <button
                  onClick={() => void sessionsQuery.refetch()}
                  className="block-control"
                  title="Обновить"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Последний вход: {formatTime(user?.last_sign_in_at)}
              </p>
              <div className="mt-4 grid gap-2">
                {(sessionsQuery.data ?? []).map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-border bg-foreground/[0.025] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-mono text-xs">{maskId(session.id)}</p>
                          {session.isCurrent && <StatusPill tone="safe">Текущая</StatusPill>}
                          <StatusPill tone={session.aal === "aal2" ? "safe" : "muted"}>
                            {session.aal ?? "AAL ?"}
                          </StatusPill>
                        </div>
                        <p className="mt-2 truncate text-[11px] text-muted-foreground">
                          {session.userAgent ?? "Device/browser недоступен"}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          Обновлена {formatTime(session.refreshedAt ?? session.updatedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => setElevatedAction({ kind: "revoke-session", session })}
                        className="editor-button h-9 shrink-0"
                      >
                        Завершить
                      </button>
                    </div>
                  </div>
                ))}
                {!sessionsQuery.isLoading && (sessionsQuery.data?.length ?? 0) === 0 && (
                  <p className="rounded-xl border border-border p-4 text-xs text-muted-foreground">
                    {sessionsQuery.error
                      ? "Не удалось получить сессии. Обновите проверку."
                      : "Активные сессии не найдены."}
                  </p>
                )}
              </div>

              {isOwner && (
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-semibold">Platform session containment</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                    Доступно только в Emergency Mode. Отзываются refresh sessions; уже выданные JWT
                    живут до expiry, а critical writes всё это время блокирует PostgreSQL.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      disabled={!emergency}
                      onClick={() =>
                        setElevatedAction({
                          kind: "revoke-platform",
                          scope: "except_current_owner",
                        })
                      }
                      className="editor-button"
                    >
                      Завершить все кроме текущей owner
                    </button>
                    <button
                      disabled={!emergency}
                      onClick={() => setElevatedAction({ kind: "revoke-platform", scope: "all" })}
                      className="editor-button text-destructive"
                    >
                      Завершить все сессии
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard interactive={false} className="p-5">
              <div className="flex items-center gap-2">
                <UserCog className="h-4 w-4 text-ember" />
                <h2 className="font-display text-sm font-semibold">Admin Accounts</h2>
              </div>
              <div className="mt-4 grid gap-2">
                {(adminsQuery.data ?? []).map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.025] px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {account.full_name ?? account.username ?? account.email}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {account.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={account.role === "owner" ? "warning" : "muted"}>
                        {account.role}
                      </StatusPill>
                      <StatusPill tone={account.is_active ? "safe" : "danger"}>
                        {account.is_active ? "active" : "disabled"}
                      </StatusPill>
                    </div>
                  </div>
                ))}
                {adminsQuery.error && (
                  <p className="rounded-xl border border-border p-4 text-xs text-muted-foreground">
                    Данные admin accounts временно недоступны.
                  </p>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <GlassCard interactive={false} className="p-5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-ember" />
                <h2 className="font-display text-sm font-semibold">Recent Security Events</h2>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Read-only timeline из admin_audit_log. Кнопки очистки нет.
              </p>
              <div className="mt-4 divide-y divide-border">
                {securityEvents.slice(0, 16).map((event) => {
                  const severity = severityFor(event.action);
                  return (
                    <div
                      key={event.id}
                      className="grid gap-2 py-3 sm:grid-cols-[110px_1fr_auto] sm:items-center"
                    >
                      <StatusPill
                        tone={
                          severity === "CRITICAL"
                            ? "danger"
                            : severity === "WARNING"
                              ? "warning"
                              : "muted"
                        }
                      >
                        {severity}
                      </StatusPill>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold">
                          {eventLabels[event.action] ?? event.action}
                        </p>
                        <p className="mt-1 truncate text-[10px] text-muted-foreground">
                          {event.action} · {event.entity_type}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime(event.created_at)}
                      </p>
                    </div>
                  );
                })}
                {securityEvents.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Security events пока отсутствуют.
                  </p>
                )}
              </div>
            </GlassCard>

            <div className="grid gap-5">
              <GlassCard interactive={false} className="p-5">
                <div className="flex items-center gap-2">
                  <ServerCog className="h-4 w-4 text-ember" />
                  <h2 className="font-display text-sm font-semibold">Защита данных</h2>
                </div>
                <div className="mt-4 grid gap-3 text-xs">
                  {[
                    ["Transport", "TLS / provider-managed", "safe"],
                    ["Encryption at rest", "Supabase managed", "safe"],
                    ["Application encryption", "Не требуется для текущих полей", "muted"],
                    ["Leaked password protection", "Требует включения в Supabase", "warning"],
                    ["Key rotation", "Недоступно через provider API", "muted"],
                    [
                      "Secrets",
                      `${sourceSecurityAudit.committedSecretFindings.length} committed findings`,
                      sourceSecurityAudit.committedSecretFindings.length ? "danger" : "safe",
                    ],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">{label}</span>
                      <StatusPill tone={tone as "safe" | "warning" | "danger" | "muted"}>
                        {value}
                      </StatusPill>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard interactive={false} className="p-5">
                <div className="flex items-center gap-2">
                  <ArchiveRestore className="h-4 w-4 text-ember" />
                  <h2 className="font-display text-sm font-semibold">Backup & Recovery</h2>
                </div>
                <div className="mt-4 grid gap-2">
                  {[
                    ["Database backup", "Provider status недоступен"],
                    ["Environment variables", "Vercel encrypted storage"],
                    [
                      "GitHub source",
                      securityBuild.gitSha === "local"
                        ? "Local build"
                        : securityBuild.gitSha.slice(0, 12),
                    ],
                    ["Vercel deployment", securityBuild.deployment],
                    ["Supabase migrations", "Versioned in Git"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-foreground/[0.025] px-3 py-2.5 text-xs"
                    >
                      <span>{label}</span>
                      <span className="text-right text-muted-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>

          <GlassCard interactive={false} className="p-5">
            <div className="flex items-start gap-3">
              <CircleHelp className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
              <div>
                <h2 className="font-display text-sm font-semibold">
                  Data classification & recovery checklist
                </h2>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  PUBLIC: published course/lesson content. INTERNAL: analytics, progress, audit
                  events. SENSITIVE: profile contacts, enrollments, session metadata. SECRET:
                  passwords, refresh/access tokens, provider keys и TOTP secrets — они не хранятся в
                  application tables и не отображаются в Admin.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    "Rotate compromised credentials in provider",
                    "Review owner/admin accounts",
                    "Inspect Supabase Auth logs",
                    "Verify backup and redeploy known-good Git SHA",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-2 rounded-xl border border-border bg-foreground/[0.025] px-3 py-3 text-xs"
                    >
                      <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ember" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      <ElevatedDialog
        key={
          elevatedAction
            ? `${elevatedAction.kind}:${"scope" in elevatedAction ? elevatedAction.scope : ""}`
            : "closed"
        }
        action={elevatedAction}
        mfaRequired={mfaEnabled}
        onClose={() => setElevatedAction(null)}
        onComplete={completeElevatedAction}
      />
    </AdminLayout>
  );
}
