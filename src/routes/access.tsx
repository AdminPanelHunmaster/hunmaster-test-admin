import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Check, Inbox, KeyRound, PowerOff, Repeat } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassCard } from "@/components/admin/GlassCard";
import { StatusBadge } from "@/components/admin/StatusBadge";
import {
  useAdminCourses,
  useAdminUsers,
  useGrantAccessMutation,
  useRevokeAccessMutation,
} from "@/hooks/useAdminBackend";
import type { AdminUser } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/access")({
  head: () => ({
    meta: [
      { title: "Доступы - HunMaster Admin" },
      {
        name: "description",
        content: "Активация, продление и отключение доступа к курсам HunMaster.",
      },
      { property: "og:title", content: "Доступы - HunMaster Admin" },
      { property: "og:description", content: "Управление доступом к курсам HunMaster." },
    ],
  }),
  component: AccessPage,
});

type Bucket = "pending" | "active" | "soon" | "expired";
type PendingAction = "grant" | "extend" | "revoke";

const buckets: { value: Bucket; label: string }[] = [
  { value: "pending", label: "Ожидают активации" },
  { value: "active", label: "Активные" },
  { value: "soon", label: "Истекают скоро" },
  { value: "expired", label: "Истёкшие" },
];

const durations = [
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
  { label: "180 дней", days: 180 },
  { label: "365 дней", days: 365 },
  { label: "Бессрочно", days: null },
] as const;

function daysLeft(user: AdminUser) {
  if (!user.accessUntil) return null;
  const [day, month, year] = user.accessUntil.split(".").map(Number);
  if (!day || !month || !year) return null;
  return Math.ceil((new Date(year, month - 1, day).getTime() - Date.now()) / 86_400_000);
}

function inBucket(user: AdminUser, bucket: Bucket) {
  if (bucket === "pending") return user.status === "pending";
  if (bucket === "expired") return user.status === "expired" || user.status === "blocked";
  if (bucket === "soon") {
    const left = daysLeft(user);
    return user.status === "active" && left !== null && left >= 0 && left <= 14;
  }
  return user.status === "active";
}

function AccessPage() {
  const usersQuery = useAdminUsers();
  const coursesQuery = useAdminCourses();
  const grantAccess = useGrantAccessMutation();
  const revokeAccess = useRevokeAccessMutation();
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const [bucket, setBucket] = useState<Bucket>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string>("");
  const [duration, setDuration] = useState<(typeof durations)[number]>(durations[1]);
  const [confirm, setConfirm] = useState<PendingAction | null>(null);

  const list = useMemo(() => users.filter((user) => inBucket(user, bucket)), [users, bucket]);
  const selected = users.find((user) => user.id === selectedId) ?? null;
  const activeCourseId = courseId || courses[0]?.id || "";
  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;

  const confirmLabel =
    confirm === "revoke"
      ? "Отключить доступ"
      : confirm === "extend"
        ? "Продлить доступ"
        : "Активировать";

  return (
    <AdminLayout title="Доступы" subtitle="Управление подписками и сроками обучения">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <GlassCard interactive={false} className="p-4 sm:p-5">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-2">
            {buckets.map((item) => (
              <button
                key={item.value}
                onClick={() => setBucket(item.value)}
                className={cn(
                  "relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
                  bucket === item.value
                    ? "text-ember"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {bucket === item.value && (
                  <motion.span
                    layoutId="access-tab"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                    className="absolute inset-0 rounded-xl border border-ember/30 bg-ember/10"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-2">
            {list.map((user, index) => (
              <motion.button
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.04 }}
                onClick={() => setSelectedId(user.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                  selectedId === user.id
                    ? "border-ember/40 bg-ember/[0.08]"
                    : "border-border/60 bg-foreground/[0.03] hover:border-ember/25",
                )}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-foreground/[0.06] text-[11px] font-bold">
                  {user.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{user.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.course} · до {user.accessUntil ?? "—"}
                  </span>
                </span>
                <StatusBadge status={user.status} />
              </motion.button>
            ))}
            {list.length === 0 && (
              <EmptyState
                icon={Inbox}
                title="Нет записей"
                description="Доступы появятся здесь после регистрации пользователей или назначения курсов."
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
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setCourseId(course.id)}
                  className={cn(
                    "rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                    activeCourseId === course.id
                      ? "border-ember/40 bg-ember/10 text-ember"
                      : "border-border bg-foreground/[0.03] text-muted-foreground hover:text-foreground",
                  )}
                >
                  {course.title}
                </button>
              ))}
              {courses.length === 0 && (
                <p className="text-sm text-muted-foreground">Курсов пока нет.</p>
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
              Длительность
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {durations.map((item) => (
                <button
                  key={item.label}
                  onClick={() => setDuration(item)}
                  className={cn(
                    "rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                    duration.label === item.label
                      ? "border-ember/40 bg-ember/10 text-ember"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              disabled={!selected || !activeCourse}
              onClick={() => setConfirm("grant")}
              className="flex items-center justify-center gap-2 rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              <Check className="h-4 w-4" />
              Активировать
            </motion.button>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={!selected || !activeCourse}
                onClick={() => setConfirm("extend")}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm transition-colors hover:border-ember/40 hover:text-ember disabled:opacity-40"
              >
                <Repeat className="h-4 w-4" />
                Продлить
              </button>
              <button
                disabled={!selected}
                onClick={() => setConfirm("revoke")}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
              >
                <PowerOff className="h-4 w-4" />
                Отключить
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      {(usersQuery.error || coursesQuery.error) && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {(usersQuery.error ?? coursesQuery.error)?.message}
        </div>
      )}

      <ConfirmModal
        open={!!confirm}
        title={confirmLabel}
        description={`${confirmLabel} для ${selected?.name ?? ""}: ${activeCourse?.title ?? "—"}, ${duration.label}.`}
        confirmLabel={confirmLabel}
        destructive={confirm === "revoke"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (selected && confirm === "revoke") {
            void revokeAccess.mutateAsync({ userId: selected.id });
          }
          if (selected && activeCourse && confirm !== "revoke") {
            void grantAccess.mutateAsync({
              userId: selected.id,
              courseId: activeCourse.id,
              days: duration.days,
            });
          }
          setConfirm(null);
        }}
      />
    </AdminLayout>
  );
}
