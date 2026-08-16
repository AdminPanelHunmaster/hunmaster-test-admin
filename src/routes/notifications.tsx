import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { UserPlus, AlertTriangle, CheckCircle2, KeyRound, CheckCheck, BellOff } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { GlassCard } from "@/components/admin/GlassCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { notifications as initialNotifications } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Уведомления — HunMaster Admin" },
      {
        name: "description",
        content: "Центр уведомлений HunMaster: заявки, сроки доступа и достижения учеников.",
      },
      { property: "og:title", content: "Уведомления — HunMaster Admin" },
      {
        property: "og:description",
        content: "Центр уведомлений HunMaster: заявки, сроки доступа и достижения учеников.",
      },
    ],
  }),
  component: NotificationsPage,
});

const icons = {
  user: UserPlus,
  warning: AlertTriangle,
  success: CheckCircle2,
  access: KeyRound,
};

const tones = {
  user: "text-ember",
  warning: "text-destructive",
  success: "text-jade",
  access: "text-ember",
};

function NotificationsPage() {
  const [items, setItems] = useState(initialNotifications);
  const unread = items.filter((i) => !i.read).length;

  return (
    <AdminLayout
      title="Уведомления"
      subtitle={items.length === 0 ? "Уведомлений пока нет" : `${unread} непрочитанных события`}
    >
      {items.length > 0 && (
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setItems((p) => p.map((i) => ({ ...i, read: true })))}
          className="flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-ember/40 hover:text-ember"
        >
          <CheckCheck className="h-4 w-4" />
          Отметить все прочитанными
        </button>
      </div>
      )}

      {items.length === 0 && (
        <EmptyState
          icon={BellOff}
          title="Уведомлений пока нет"
          description="Заявки, сроки доступа и события учеников появятся здесь автоматически."
        />
      )}

      <div className="grid gap-2.5">
        {items.map((n, i) => {
          const Icon = icons[n.kind];
          return (
            <GlassCard
              key={n.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: i * 0.06 }}
              className={cn("p-4", n.read && "opacity-60")}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-foreground/5",
                    tones[n.kind],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-ember" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{n.time}</p>
                </div>
                {!n.read && (
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() =>
                      setItems((p) => p.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                    }
                    className="shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-ember/40 hover:text-ember"
                  >
                    Прочитано
                  </motion.button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </AdminLayout>
  );
}