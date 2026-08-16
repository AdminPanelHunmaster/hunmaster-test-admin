import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Bell, GraduationCap, Palette, Settings2, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";
import { usePlatformSettings, useSaveSettingMutation } from "@/hooks/useAdminBackend";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки - HunMaster Admin" },
      {
        name: "description",
        content: "Настройки платформы HunMaster из Supabase.",
      },
      { property: "og:title", content: "Настройки - HunMaster Admin" },
      { property: "og:description", content: "Настройки платформы HunMaster из Supabase." },
    ],
  }),
  component: SettingsPage,
});

const tabs = [
  { id: "general", label: "Общие", icon: Settings2 },
  { id: "course", label: "Курсы", icon: GraduationCap },
  { id: "notify", label: "Уведомления", icon: Bell },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
] as const;

type TabId = (typeof tabs)[number]["id"];
type GeneralSettings = {
  projectName: string;
  telegramUrl: string;
  facebookUrl: string;
  supportEmail: string;
};

const defaultGeneral: GeneralSettings = {
  projectName: "HunMaster",
  telegramUrl: "",
  facebookUrl: "",
  supportEmail: "",
};

function parseGeneral(value: unknown): GeneralSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) return defaultGeneral;
  const record = value as Record<string, unknown>;
  return {
    projectName:
      typeof record["projectName"] === "string"
        ? record["projectName"]
        : defaultGeneral.projectName,
    telegramUrl:
      typeof record["telegramUrl"] === "string"
        ? record["telegramUrl"]
        : defaultGeneral.telegramUrl,
    facebookUrl:
      typeof record["facebookUrl"] === "string"
        ? record["facebookUrl"]
        : defaultGeneral.facebookUrl,
    supportEmail:
      typeof record["supportEmail"] === "string"
        ? record["supportEmail"]
        : defaultGeneral.supportEmail,
  };
}

function Field({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? ""}
        className="mt-2 h-10 w-full rounded-xl border border-border bg-foreground/[0.04] px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
      />
    </label>
  );
}

function Toggle({ label, hint, on }: { label: string; hint: string; on?: boolean }) {
  const [active, setActive] = useState(!!on);
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-foreground/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <button
        onClick={() => setActive((current) => !current)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors",
          active ? "border-ember/50 bg-ember/25" : "border-border bg-foreground/10",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full",
            active ? "right-0.5 bg-ember" : "left-0.5 bg-muted-foreground",
          )}
        />
      </button>
    </div>
  );
}

function SettingsPage() {
  const settingsQuery = usePlatformSettings();
  const saveSetting = useSaveSettingMutation();
  const [tab, setTab] = useState<TabId>("general");
  const [general, setGeneral] = useState<GeneralSettings>(defaultGeneral);

  useEffect(() => {
    const row = settingsQuery.data?.find((setting) => setting.key === "general");
    if (row) setGeneral(parseGeneral(row.value));
  }, [settingsQuery.data]);

  return (
    <AdminLayout title="Настройки" subtitle="Конфигурация платформы">
      <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
        <GlassCard interactive={false} className="h-fit p-2">
          <div className="flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors",
                  tab === item.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === item.id && (
                  <motion.span
                    layoutId="settings-tab"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-xl border border-ember/25 bg-foreground/[0.06]"
                  />
                )}
                <item.icon
                  className={cn("relative z-10 h-4 w-4", tab === item.id && "text-ember")}
                />
                <span className="relative z-10 font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard interactive={false} className="p-5">
          {settingsQuery.error && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {settingsQuery.error.message}
            </div>
          )}

          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4"
          >
            {tab === "general" && (
              <>
                <Field
                  label="Название проекта"
                  value={general.projectName}
                  onChange={(projectName) => setGeneral((current) => ({ ...current, projectName }))}
                />
                <Field
                  label="Telegram"
                  value={general.telegramUrl}
                  placeholder="Пока не указан"
                  onChange={(telegramUrl) => setGeneral((current) => ({ ...current, telegramUrl }))}
                />
                <Field
                  label="Facebook"
                  value={general.facebookUrl}
                  placeholder="Пока не указан"
                  onChange={(facebookUrl) => setGeneral((current) => ({ ...current, facebookUrl }))}
                />
                <Field
                  label="Email поддержки"
                  value={general.supportEmail}
                  placeholder="Пока не указан"
                  onChange={(supportEmail) =>
                    setGeneral((current) => ({ ...current, supportEmail }))
                  }
                />
              </>
            )}
            {tab === "course" && (
              <>
                <Toggle label="Автопубликация уроков" hint="Новые уроки сразу видны ученикам" />
                <Toggle
                  label="Последовательное прохождение"
                  hint="Следующий урок после завершения предыдущего"
                  on
                />
              </>
            )}
            {tab === "notify" && (
              <>
                <Toggle label="Email при новой регистрации" hint="Письмо администратору" on />
                <Toggle label="Напоминание об истечении доступа" hint="За 3 дня до окончания" on />
                <Toggle label="Telegram-оповещения" hint="Дублировать события в чат админов" />
              </>
            )}
            {tab === "theme" && (
              <>
                <Toggle label="Тёмная тема" hint="Фирменная палитра HunMaster" on />
                <Toggle label="Liquid Glass эффекты" hint="Стеклянные поверхности и блики" on />
                <Toggle label="Уменьшенная анимация" hint="Для слабых устройств" />
              </>
            )}
            {tab === "security" && (
              <>
                <Toggle
                  label="Двухфакторная аутентификация"
                  hint="Будет доступна после настройки Supabase Auth MFA"
                />
                <Toggle
                  label="Журнал действий администратора"
                  hint="История изменений доступа"
                  on
                />
                <p className="rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-xs text-muted-foreground">
                  Авторизация, роли и защита маршрутов проверяются через Supabase Auth, RLS и
                  функции PostgreSQL.
                </p>
              </>
            )}
          </motion.div>

          <button
            onClick={() => void saveSetting.mutateAsync({ key: "general", value: general })}
            className="mt-6 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Сохранить изменения
          </button>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
