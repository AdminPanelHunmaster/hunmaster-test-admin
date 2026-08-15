import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { KeyRound, Check, Repeat, PowerOff, Inbox } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { SegmentedControl } from "@/components/admin/ChartCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { courses, users as seedUsers, type AdminUser, type UserStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Доступы — HunMaster Admin" },
      {
        name: "description",
        content: "Активация, продление и отключение доступа к курсам HunMaster.",
      },
      { property: "og:title", content: "Доступы — HunMaster Admin" },
      {
        property: "og:description",
        content: "Активация, продление и отключение доступа к курсам HunMaster.",
      },
    ],
  }),
  component: AccessPage,
});

type Bucket = "pending" | "active" | "soon" | "expired";

const buckets: { value: Bucket; label: string }[] = [
  { value: "pending", label: "Ожидают активации" },
  { value: "active", label: "Активные" },
  { value: "soon", label: "Истекают скоро" },
  { value: "expired", label: "Истёкшие" },
];

const durations = ["30 дней", "90 дней", "180 дней", "365 дней", "Бессрочно"];

function daysLeft(u: AdminUser) {
  if (!u.accessUntil) return null;
  const [d, m, y] = u.accessUntil.split(".").map(Number);
  if (!d || !m || !y) return null;
  return Math.ceil((new Date(y, m - 1, d).getTime() - Date.now()) / 86_400_000);
}

function inBucket(u: AdminUser, b: Bucket) {
  if (b === "pending") return u.status === "pending";
  if (b === "expired") return u.status === "expired" || u.status === "blocked";
  if (b === "soon") {
    const left = daysLeft(u);
    return u.status === "active" && left !== null && left >= 0 && left <= 14;
  }
  return u.status === "active";
}

function AccessPage() {
  const [users, setUsers] = useState<AdminUser[]>(seedUsers);
  const [bucket, setBucket] = useState<Bucket>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [course, setCourse] = useState(courses[0]!.title);
  const [duration, setDuration] = useState(durations[1]!);
  const [confirm, setConfirm] = useState<{ label: string; status: UserStatus } | null>(null);

  const list = useMemo(() => users.filter((u) => inBucket(u, bucket)), [users, bucket]);
  const selected = users.find((u) => u.id === selectedId) ?? null;

  return (
    <AdminLayout title="Доступы" subtitle="Управление подписками и сроками обучения">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <GlassCard interactive={false} className="p-4 sm:p-5">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
            {buckets.map((b) => (
              <button
                key={b.value}
                onClick={() => setBucket(b.value)}
                className={cn(
                  "relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
                  bucket === b.value ? "text-ember" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {bucket === b.value && (
                  <motion.span
                    layoutId="access-tab"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-xl border border-ember/30 bg-ember/10"
                  />
                )}
                <span className="relative z-10">{b.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2">
            {list.map((u, i) => (
              <motion.button
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                onClick={() => setSelectedId(u.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  selectedId === u.id
                    ? "border-ember/40 bg-ember/[0.08]"
                    : "border-border/60 bg-foreground/[0.03] hover:border-ember/25",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-foreground/[0.06] text-[11px] font-bold">
                  {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{u.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {u.course} · до {u.accessUntil ?? "—"}
                  </span>
                </span>
                <StatusBadge status={u.status} />
              </motion.button>
            ))}
            {list.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="Нет активных подписок"
                description="Доступы появятся здесь, как только зарегистрируются реальные пользователи."
              />
            )}
          </div>
        </GlassCard>

        <GlassCard interactive={false} className="h-fit p-5">
          <div className="flex items-center gap-2 text-ember">
            <KeyRound className="h-4 w-4" />
            <h3 className="font-display text-base font-semibold text-foreground">
              Назначить доступ
            </h3>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {selected ? selected.name : "Выберите пользователя из списка"}
          </p>

          <div className="mt-5">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Курс</p>
            <div className="mt-2 grid gap-2">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCourse(c.title)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                    course === c.title
                      ? "border-ember/40 bg-ember/10 text-ember"
                      : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground",
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Длительность
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {durations.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                    duration === d
                      ? "border-ember/40 bg-ember/10 text-ember"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!selected}
              onClick={() => setConfirm({ label: "Активировать доступ", status: "active" })}
              className="flex items-center justify-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Активировать
            </motion.button>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!selected}
                onClick={() => setConfirm({ label: "Продлить доступ", status: "active" })}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:border-ember/40 hover:text-ember disabled:opacity-40"
              >
                <Repeat className="h-4 w-4" />
                Продлить
              </button>
              <button
                disabled={!selected}
                onClick={() => setConfirm({ label: "Отключить доступ", status: "expired" })}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
              >
                <PowerOff className="h-4 w-4" />
                Отключить
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.label ?? ""}
        description={`${confirm?.label ?? ""} для ${selected?.name ?? ""}: ${course}, ${duration}.`}
        confirmLabel={confirm?.label ?? "Подтвердить"}
        destructive={confirm?.status === "expired"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (selected && confirm) {
            const status = confirm.status;
            setUsers((prev) =>
              prev.map((u) => (u.id === selected.id ? { ...u, status, course } : u)),
            );
          }
          setConfirm(null);
        }}
      />
    </AdminLayout>
  );
}