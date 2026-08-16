import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Activity,
  Ban,
  BookOpen,
  CalendarX,
  Clock3,
  GraduationCap,
  Hourglass,
  KeyRound,
  LineChart as LineChartIcon,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ChartCard, SegmentedControl } from "@/components/admin/ChartCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassCard } from "@/components/admin/GlassCard";
import { StatCard } from "@/components/admin/StatCard";
import { useDashboardMetrics } from "@/hooks/useAdminBackend";
import type { ActivityItem } from "@/lib/data";
import { chartTooltipStyle } from "@/lib/chart-theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard - HunMaster Admin" },
      {
        name: "description",
        content: "Real HunMaster Admin metrics from Supabase.",
      },
      { property: "og:title", content: "Dashboard - HunMaster Admin" },
      { property: "og:description", content: "Real HunMaster Admin metrics from Supabase." },
    ],
  }),
  component: Dashboard,
});

const feedIcons = {
  user: UserPlus,
  access: KeyRound,
  expire: Clock3,
  lesson: BookOpen,
  progress: TrendingUp,
} as const;

function Dashboard() {
  const [range, setRange] = useState<"7" | "30" | "90">("7");
  const dashboard = useDashboardMetrics();
  const metrics = dashboard.data;
  const newUsersData = metrics?.newUsersSeries[range] ?? [];
  const activeStudentsSeries = metrics?.activeStudentsSeries ?? [];
  const activityFeed: ActivityItem[] =
    metrics?.recentActivity.map((item) => ({
      id: item.id,
      text: `${item.action} · ${item.entity_type}`,
      time: new Intl.DateTimeFormat("ru-RU").format(new Date(item.created_at)),
      kind: "access",
    })) ?? [];

  return (
    <AdminLayout title="Добро пожаловать в HunMaster Admin" subtitle="Обзор платформы">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          index={0}
          label="Всего пользователей"
          value={metrics?.usersTotal ?? 0}
          icon={Users}
        />
        <StatCard
          index={1}
          label="Активный доступ"
          value={metrics?.activeAccess ?? 0}
          icon={ShieldCheck}
          tone="jade"
        />
        <StatCard
          index={2}
          label="Ожидают активации"
          value={metrics?.pendingUsers ?? 0}
          icon={Hourglass}
          tone="ember"
        />
        <StatCard
          index={3}
          label="Истёк доступ"
          value={metrics?.expiredAccess ?? 0}
          icon={CalendarX}
          tone="muted"
        />
        <StatCard
          index={4}
          label="Заблокировано"
          value={metrics?.blockedUsers ?? 0}
          icon={Ban}
          tone="danger"
        />
        <StatCard
          index={5}
          label="Курсов"
          value={metrics?.coursesTotal ?? 0}
          icon={GraduationCap}
        />
      </div>

      {dashboard.error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {dashboard.error.message}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Новые пользователи"
          description="Динамика регистраций"
          delay={0.1}
          className="xl:col-span-2"
          actions={
            <SegmentedControl
              value={range}
              onChange={setRange}
              options={[
                { value: "7", label: "7 дней" },
                { value: "30", label: "30 дней" },
                { value: "90", label: "90 дней" },
              ]}
            />
          }
        >
          {newUsersData.every((point) => point.value === 0) ? (
            <EmptyState
              icon={LineChartIcon}
              title="Недостаточно данных для аналитики"
              description="График построится автоматически после первых регистраций."
              className="h-64"
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={newUsersData} margin={{ left: -18, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="emberFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ember)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--ember)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Регистрации"
                    stroke="var(--ember)"
                    strokeWidth={2}
                    fill="url(#emberFill)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Активные ученики" description="По месяцам" delay={0.18}>
          {activeStudentsSeries.length === 0 ? (
            <EmptyState
              icon={LineChartIcon}
              title="Недостаточно данных для аналитики"
              description="Данные появятся после активности учеников."
              className="h-64"
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeStudentsSeries} margin={{ left: -18, right: 6, top: 6 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  />
                  <Tooltip {...chartTooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Ученики"
                    stroke="var(--jade)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--jade)" }}
                    animationDuration={1100}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>
      </div>

      <GlassCard
        interactive={false}
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.26 }}
        className="mt-5 p-5"
      >
        <h3 className="font-display text-base font-semibold">Последние действия</h3>
        {activityFeed.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={Activity}
            title="Пока нет активности"
            description="События появятся здесь после действий реальных пользователей и администраторов."
          />
        ) : (
          <div className="mt-4 grid gap-2">
            {activityFeed.map((item, index) => {
              const Icon = feedIcons[item.kind as keyof typeof feedIcons] ?? UserPlus;
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + index * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-foreground/[0.03] px-3.5 py-3 transition-colors hover:border-ember/25 hover:bg-ember/[0.06]"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-foreground/5 text-ember">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm">{item.text}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{item.time}</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </AdminLayout>
  );
}
