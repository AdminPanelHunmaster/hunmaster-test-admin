import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  X,
  Mail,
  Send,
  CalendarDays,
  Clock,
  GraduationCap,
  ShieldCheck,
  CalendarPlus,
  Repeat,
  PauseCircle,
  Ban,
  Trash2,
} from "lucide-react";
import type { AdminUser, UserStatus } from "@/lib/data";
import { StatusBadge } from "./StatusBadge";
import { ConfirmModal } from "./ConfirmModal";

type PendingAction = {
  title: string;
  description: string;
  destructive: boolean;
  status?: UserStatus;
  confirmLabel: string;
} | null;

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 py-2.5 last:border-0">
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="truncate text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

export function UserDrawer({
  user,
  onClose,
  onStatusChange,
  onDelete,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onStatusChange: (id: string, status: UserStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [pending, setPending] = useState<PendingAction>(null);

  const actions = [
    {
      label: "Активировать доступ",
      icon: ShieldCheck,
      status: "active" as UserStatus,
      destructive: false,
    },
    {
      label: "Продлить доступ",
      icon: CalendarPlus,
      status: "active" as UserStatus,
      destructive: false,
    },
    { label: "Изменить курс", icon: Repeat, destructive: false },
    {
      label: "Приостановить доступ",
      icon: PauseCircle,
      status: "pending" as UserStatus,
      destructive: true,
    },
    { label: "Заблокировать", icon: Ban, status: "blocked" as UserStatus, destructive: true },
    { label: "Удалить пользователя", icon: Trash2, destructive: true, remove: true },
  ];

  return (
    <>
      <AnimatePresence>
        {user && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-background/60 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "100%", opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.4 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="glass-panel fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto rounded-l-3xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-ember/30 bg-foreground/[0.06] font-display text-sm font-semibold">
                    {user.name
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display truncate text-lg font-semibold">{user.name}</h2>
                    <StatusBadge status={user.status} className="mt-1.5" />
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-6 rounded-2xl border border-border bg-foreground/[0.03] px-4">
                <Row icon={Mail} label="Email" value={user.email} />
                <Row icon={Send} label="Telegram" value={user.telegram} />
                <Row icon={CalendarDays} label="Регистрация" value={user.registeredAt} />
                <Row icon={Clock} label="Последний вход" value={user.lastLogin} />
                <Row icon={GraduationCap} label="Курс" value={user.course} />
                <Row icon={CalendarPlus} label="Начало доступа" value={user.accessFrom ?? "—"} />
                <Row icon={ShieldCheck} label="Доступ до" value={user.accessUntil ?? "—"} />
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-foreground/[0.03] p-4">
                <div className="flex items-baseline justify-between">
                  <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">
                    Прогресс курса
                  </p>
                  <p className="font-display text-xl font-semibold text-ember">{user.progress}%</p>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${user.progress}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-[var(--gradient-ember)]"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {actions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() =>
                      setPending({
                        title: a.label,
                        description: a.destructive
                          ? `Действие «${a.label.toLowerCase()}» будет применено к пользователю ${user.name}.`
                          : `Применить «${a.label.toLowerCase()}» к пользователю ${user.name}?`,
                        destructive: a.destructive,
                        confirmLabel: a.label,
                        ...(("remove" in a && a.remove) || !a.status ? {} : { status: a.status }),
                        ...("remove" in a && a.remove ? { remove: true } : {}),
                      } as PendingAction)
                    }
                    className={
                      a.destructive
                        ? "flex items-center gap-2.5 rounded-xl border border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive"
                        : "flex items-center gap-2.5 rounded-xl border border-border px-4 py-2.5 text-sm transition-colors hover:border-ember/40 hover:text-ember"
                    }
                  >
                    <a.icon className="h-4 w-4" />
                    {a.label}
                  </button>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!pending}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        confirmLabel={pending?.confirmLabel ?? "Подтвердить"}
        destructive={pending?.destructive ?? false}
        onCancel={() => setPending(null)}
        onConfirm={() => {
          if (user && pending) {
            if (pending.title === "Удалить пользователя") {
              onDelete(user.id);
              onClose();
            } else if (pending.status) {
              onStatusChange(user.id, pending.status);
            }
          }
          setPending(null);
        }}
      />
    </>
  );
}
