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
import { Users, Gauge, Timer, CheckCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { ChartCard } from "@/components/admin/ChartCard";
import { GlassCard } from "@/components/admin/GlassCard";
import { popularLessons, retentionSeries, weekdayActivity } from "@/lib/mock-data";
import { chartTooltipStyle } from "@/lib/chart-theme";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Аналитика — HunMaster Admin" },
      {
        name: "description",
        content: "Прогресс учеников, retention и популярные уроки платформы HunMaster.",
      },
      { property: "og:title", content: "Аналитика — HunMaster Admin" },
      {
        property: "og:description",
        content: "Прогресс учеников, retention и популярные уроки платформы HunMaster.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function ProgressRing({ value, label, sub }: { value: number; label: string; sub: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--border)" strokeWidth="9" />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="var(--ember)"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c - (c * value) / 100 }}
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
  return (
    <AdminLayout title="Аналитика" subtitle="Демонстрационные показатели обучения">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} label="Количество учеников" value={128} icon={Users} />
        <StatCard index={1} label="Средний прогресс" value={47} icon={Gauge} tone="ember" hint="%" />
        <StatCard index={2} label="Среднее время обучения" value={38} icon={Timer} hint="мин / день" />
        <StatCard
          index={3}
          label="Завершённые уроки"
          value={1246}
          icon={CheckCheck}
          tone="jade"
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ChartCard title="Активность по дням" description="Средние сессии за неделю" delay={0.1} className="xl:col-span-2">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekdayActivity} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Bar dataKey="value" name="Сессии" radius={[8, 8, 4, 4]} animationDuration={900}>
                  {weekdayActivity.map((d, i) => (
                    <Cell key={d.label} fill={i > 4 ? "var(--ember-soft)" : "var(--ember)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Retention" description="Возврат учеников по неделям" delay={0.18}>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={retentionSeries} margin={{ left: -18, right: 6, top: 6 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <Tooltip {...chartTooltipStyle} />
                <Line type="monotone" dataKey="value" name="Retention, %" stroke="var(--jade)" strokeWidth={2} dot={{ r: 3, fill: "var(--jade)" }} animationDuration={1100} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1.3fr]">
        <GlassCard interactive={false} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.24 }} className="p-5">
          <h3 className="font-display text-base font-semibold">Ключевые метрики</h3>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <ProgressRing value={47} label="Средний прогресс" sub="по всем курсам" />
            <ProgressRing value={68} label="Завершаемость" sub="начатых модулей" />
            <ProgressRing value={54} label="Retention 8 нед." sub="активные ученики" />
          </div>
        </GlassCard>

        <GlassCard interactive={false} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="p-5">
          <h3 className="font-display text-base font-semibold">Самые популярные уроки</h3>
          <div className="mt-4 grid gap-3">
            {popularLessons.map((l, i) => (
              <div key={l.title}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{l.title}</span>
                  <span className="shrink-0 text-muted-foreground">{l.views}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(l.views / 412) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="h-full rounded-full bg-[var(--gradient-ember)]"
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AdminLayout>
  );
}