import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Settings2, GraduationCap, Bell, Palette, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — HunMaster Admin" },
      {
        name: "description",
        content: "Общие настройки проекта HunMaster, курсов, уведомлений, темы и безопасности.",
      },
      { property: "og:title", content: "Настройки — HunMaster Admin" },
      {
        property: "og:description",
        content: "Общие настройки проекта HunMaster, курсов, уведомлений, темы и безопасности.",
      },
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
];

function Field({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </span>
      <input
        defaultValue={value ?? ""}
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
        onClick={() => setActive((a) => !a)}
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
  const [tab, setTab] = useState("general");

  return (
    <AdminLayout title="Настройки" subtitle="Конфигурация платформы — интерфейсные заглушки">
      <div className="grid gap-4 xl:grid-cols-[240px_1fr]">
        <GlassCard interactive={false} className="h-fit p-2">
          <div className="flex gap-1 overflow-x-auto xl:flex-col xl:overflow-visible">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm whitespace-nowrap transition-colors",
                  tab === t.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab === t.id && (
                  <motion.span
                    layoutId="settings-tab"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-xl border border-ember/25 bg-foreground/[0.06]"
                  />
                )}
                <t.icon className={cn("relative z-10 h-4 w-4", tab === t.id && "text-ember")} />
                <span className="relative z-10 font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard interactive={false} className="p-5">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-4"
          >
            {tab === "general" && (
              <>
                <Field label="Название проекта" value="HunMaster" />
                <Field label="Telegram" value="https://t.me/HunMaster" />
                <Field label="Facebook" placeholder="Пока не указан" />
                <Field label="Email поддержки" value="support@hunmaster.hu" />
              </>
            )}
            {tab === "course" && (
              <>
                <Field label="Курс по умолчанию" value="Hungarian A1" />
                <Field label="Стандартный срок доступа" value="90 дней" />
                <Toggle label="Автопубликация уроков" hint="Новые уроки сразу видны ученикам" />
                <Toggle label="Последовательное прохождение" hint="Следующий урок после завершения предыдущего" on />
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
                <Toggle label="Двухфакторная аутентификация" hint="Будет доступна после подключения backend" />
                <Toggle label="Журнал действий администратора" hint="История изменений доступа" on />
                <p className="rounded-xl border border-border bg-foreground/[0.03] px-4 py-3 text-xs text-muted-foreground">
                  Реальная авторизация, роли и защита маршрутов подключаются на следующем этапе.
                </p>
              </>
            )}
          </motion.div>
          <button className="mt-6 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            Сохранить изменения
          </button>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}