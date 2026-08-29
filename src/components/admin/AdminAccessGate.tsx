import { useState, type ReactNode } from "react";
import { Loader2, LockKeyhole, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { isSupabaseConfigured, supabaseConfigurationError } from "@/lib/supabase/client";
import { requestPasswordReset, signIn } from "@/services/auth";
import { getErrorMessage } from "@/services/errors";
import { isAdminRole } from "@/services/permissions";
import { useAuth } from "@/hooks/useAuth";

function AccessPanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid min-h-[58vh] place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-panel w-full max-w-md rounded-3xl p-6"
      >
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-ember/30 bg-ember/10 text-ember">
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="font-display mt-4 text-xl font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {children}
      </motion.div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await signIn(email, password);
    } catch (loginError) {
      setError(getErrorMessage(loginError, "Не удалось войти."));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email) {
      setError("Укажите email для восстановления пароля.");
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setMessage("Если аккаунт существует, Supabase отправит письмо для восстановления.");
    } catch (resetError) {
      setError(getErrorMessage(resetError, "Не удалось отправить письмо."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccessPanel
      icon={LockKeyhole}
      title="Вход администратора"
      description="HunMaster Admin подключён к Supabase Auth. Войдите аккаунтом с ролью admin или owner."
    >
      <form className="mt-5 grid gap-3" onSubmit={(event) => void submit(event)}>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          placeholder="admin@example.com"
          className="h-11 rounded-xl border border-border bg-foreground/[0.04] px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          placeholder="Пароль"
          className="h-11 rounded-xl border border-border bg-foreground/[0.04] px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
        />
        {error && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-xl border border-jade/30 bg-jade/10 px-3 py-2 text-sm text-jade">
            {message}
          </p>
        )}
        <button
          disabled={busy}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Войти
        </button>
        <button
          type="button"
          onClick={() => void reset()}
          disabled={busy}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          Восстановить пароль
        </button>
      </form>
    </AccessPanel>
  );
}

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const { user, profile, loading, error } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <AccessPanel
        icon={SlidersHorizontal}
        title="Supabase не настроен"
        description={
          supabaseConfigurationError ??
          "Добавьте VITE_SUPABASE_URL и публичный Supabase key в окружение Vercel."
        }
      />
    );
  }

  if (loading) {
    return (
      <AccessPanel
        icon={Loader2}
        title="Проверяем доступ"
        description="Восстанавливаем Supabase-сессию и профиль администратора."
      />
    );
  }

  if (error) {
    return (
      <AccessPanel icon={ShieldAlert} title="Не удалось проверить доступ" description={error} />
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (!profile || !profile.is_active || !isAdminRole(profile.role)) {
    return (
      <AccessPanel
        icon={ShieldAlert}
        title="Нет доступа к админке"
        description="Для входа нужен активный профиль с ролью admin или owner. Роль проверяется на уровне Supabase/PostgreSQL."
      />
    );
  }

  return <>{children}</>;
}
