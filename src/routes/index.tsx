import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Users,
  ShieldCheck,
  Hourglass,
  CalendarX,
  Ban,
  GraduationCap,
  UserPlus,
  KeyRound,
  Clock3,
  BookOpen,
  TrendingUp,
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
import { StatCard } from "@/components/admin/StatCard";
import { ChartCard, SegmentedControl } from "@/components/admin/ChartCard";
import { GlassCard } from "@/components/admin/GlassCard";
import { activeStudentsSeries, activityFeed, newUsersSeries } from "@/lib/data";
import { chartTooltipStyle } from "@/lib/chart-theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — HunMaster Admin" },
      {
        name: "description",
        content:
          "Обзор пользователей, доступов и активности платформы курсов венгерского языка HunMaster.",
      },
      { property: "og:title", content: "Dashboard — HunMaster Admin" },
      {
        property: "og:description",
        content: "Обзор пользователей, доступов и активности платформы HunMaster.",
      },
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

  return (
    <AdminLayout
      title="Добро пожаловать в HunMaster Admin"
      subtitle="Обзор платформы на 08.08.2026"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard index={0} label="Всего пользователей" value={128} icon={Users} />
        <StatCard index={1} label="Активный доступ" value={73} icon={ShieldCheck} tone="jade" />
        <StatCard index={2} label="Ожидают активации" value={14} icon={Hourglass} tone="ember" />
        <StatCard index={3} label="Истёк доступ" value={21} icon={CalendarX} tone="muted" />
        <StatCard index={4} label="Заблокировано" value={3} icon={Ban} tone="danger" />
        <StatCard index={5} label="Курсов" value={4} icon={GraduationCap} />
      </div>

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
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={newUsersSeries[range]} margin={{ left: -18, right: 6, top: 6 }}>
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
        </ChartCard>

        <ChartCard title="Активные ученики" description="По месяцам, 2026" delay={0.18}>
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
        <div className="mt-4 grid gap-2">
          {activityFeed.map((item, i) => {
            const Icon = feedIcons[item.kind as keyof typeof feedIcons] ?? UserPlus;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.06 }}
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
      </GlassCard>
    </AdminLayout>
  );
}