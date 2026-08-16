import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, BookOpen, CheckCheck, Gauge, Timer, Users } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ChartCard } from "@/components/admin/ChartCard";
import { EmptyState } from "@/components/admin/EmptyState";
import { GlassCard } from "@/components/admin/GlassCard";
import { StatCard } from "@/components/admin/StatCard";
import { useAnalyticsMetrics } from "@/hooks/useAdminBackend";
import { chartTooltipStyle } from "@/lib/chart-theme";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика - HunMaster Admin" },
      {
        name: "description",
        content: "Прогресс учеников и активность HunMaster из Supabase.",
      },
      { property: "og:title", content: "Аналитика - HunMaster Admin" },
      {
        property: "og:description",
        content: "Прогресс учеников и активность HunMaster из Supabase.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function ProgressRing({ value, label, sub }: { value: number; label: string; sub: string }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--border)" strokeWidth="9" />
          <motion.circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--ember)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (circumference * value) / 100 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-2xl font-semibold">{value}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const analytics = useAnalyticsMetrics();
  const metrics = analytics.data;
  const weekdayActivity = metrics?.weekdayActivity ?? [];
  const retentionSeries = metrics?.retentionSeries ?? [];
  const popularLessons = metrics?.popularLessons ?? [];
  const maxViews = popularLessons.reduce((max, lesson) => Math.max(max, lesson.views), 0);

  return (
    <AdminLayout title="Аналитика" subtitle="Показатели обучения по реальным данным">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="Количество учеников"
          value={metrics?.students ?? 0}
          icon={Users}
        />
        <StatCard
          index={1}
          label="Средний прогресс"
          value={metrics?.averageProgress ?? 0}
          icon={Gauge}
          tone="ember"
          hint="%"
        />
        <StatCard
          index={2}
          label="Среднее время обучения"
          value={0}
          icon={Timer}
          hint="мин / день"
        />
        <StatCard
          index={3}
          label="Завершённые уроки"
          value={metrics?.completedLessons ?? 0}
          icon={CheckCheck}
          tone="jade"
        />
      </div>

      {analytics.error && (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {analytics.error.message}
        </div>
      )}

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ChartCard
          title="Активность по дням"
          description="Завершённые уроки за неделю"
          delay={0.1}
          className="xl:col-span-2"
        >
          {weekdayActivity.every((point) => point.value === 0) ? (
            <EmptyState
              icon={BarChart3}
              title="Недостаточно данных для аналитики"
              description="График появится, когда ученики начнут завершать уроки."
              className="h-64"
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayActivity} margin={{ left: -18, right: 6, top: 6 }}>
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
                  <Bar dataKey="value" name="Уроки" radius={[8, 8, 4, 4]} animationDuration={900}>
                    {weekdayActivity.map((point, index) => (
                      <Cell
                        key={point.label}
                        fill={index > 4 ? "var(--ember-soft)" : "var(--ember)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Retention" description="Активные ученики по месяцам" delay={0.18}>
          {retentionSeries.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Недостаточно данных для аналитики"
              description="Retention рассчитается после активности учеников."
              className="h-64"
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionSeries} margin={{ left: -18, right: 6, top: 6 }}>
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

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <GlassCard
          interactive={false}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="p-5"
        >
          <h3 className="font-display text-base font-semibold">Ключевые метрики</h3>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <ProgressRing
              value={metrics?.averageProgress ?? 0}
              label="Средний прогресс"
              sub="по всем урокам"
            />
            <ProgressRing value={0} label="Завершаемость" sub="начатых модулей" />
            <ProgressRing value={0} label="Retention 8 нед." sub="активные ученики" />
          </div>
        </GlassCard>

        <GlassCard
          interactive={false}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="p-5"
        >
          <h3 className="font-display text-base font-semibold">Самые популярные уроки</h3>
          {popularLessons.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={BookOpen}
              title="Недостаточно данных для аналитики"
              description="Рейтинг уроков появится после первых просмотров."
            />
          ) : (
            <div className="mt-4 grid gap-3">
              {popularLessons.map((lesson, index) => (
                <div key={lesson.title}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{lesson.title}</span>
                    <span className="shrink-0 text-muted-foreground">{lesson.views}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${maxViews ? (lesson.views / maxViews) * 100 : 0}%` }}
                      transition={{
                        duration: 0.9,
                        delay: 0.3 + index * 0.08,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="h-full rounded-full bg-[var(--gradient-ember)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AdminLayout>
  );
}
