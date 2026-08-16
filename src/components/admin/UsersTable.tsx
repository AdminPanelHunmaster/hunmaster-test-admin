import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Search, ArrowUpDown, ChevronRight, Users as UsersIcon } from "lucide-react";
import type { AdminUser, UserStatus } from "@/lib/data";
import { StatusBadge } from "./StatusBadge";
import { GlassCard } from "./GlassCard";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

const filters: { value: UserStatus | "all"; label: string }[] = [
  { value: "all", label: "Все" },
  { value: "active", label: "Активные" },
  { value: "pending", label: "Ожидают" },
  { value: "expired", label: "Истёк" },
  { value: "blocked", label: "Заблокированы" },
];

type SortKey = "name" | "registeredAt" | "accessUntil" | "status";

export function UsersTable({
  users,
  onSelect,
}: {
  users: AdminUser[];
  onSelect: (u: AdminUser) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserStatus | "all">("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((u) => (filter === "all" ? true : u.status === filter))
      .filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.telegram.toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const av = a[sort.key] ?? "";
        const bv = b[sort.key] ?? "";
        return String(av).localeCompare(String(bv), "ru") * sort.dir;
      });
  }, [users, query, filter, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 1 ? -1 : 1 }));

  return (
    <GlassCard interactive={false} className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск пользователя..."
            className="h-10 w-full rounded-xl border border-border bg-foreground/[0.04] pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
          />
        </div>
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "relative shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition-colors",
                filter === f.value ? "text-ember" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {filter === f.value && (
                <motion.span
                  layoutId="user-filter"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  className="absolute inset-0 rounded-xl border border-ember/30 bg-ember/10"
                />
              )}
              <span className="relative z-10">{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 -mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[900px] border-separate border-spacing-y-1.5 text-left">
          <thead>
            <tr className="text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
              {(
                [
                  ["Пользователь", "name"],
                  ["Email", null],
                  ["Telegram", null],
                  ["Курс", null],
                  ["Статус", "status"],
                  ["Регистрация", "registeredAt"],
                  ["Доступ до", "accessUntil"],
                  ["", null],
                ] as [string, SortKey | null][]
              ).map(([label, key]) => (
                <th key={label} className="px-3 pb-2 font-semibold">
                  {key ? (
                    <button
                      onClick={() => toggleSort(key)}
                      className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                    >
                      {label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((u, i) => (
              <motion.tr
                key={u.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.025, 0.3) }}
                onClick={() => onSelect(u)}
                className="group cursor-pointer"
              >
                <td className="rounded-l-xl border-y border-l border-border/60 bg-foreground/[0.03] px-3 py-3 transition-colors group-hover:border-ember/30 group-hover:bg-ember/[0.07]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-foreground/[0.06] text-[11px] font-bold">
                      {u.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span className="text-sm font-semibold">{u.name}</span>
                  </div>
                </td>
                <td className="border-y border-border/60 bg-foreground/[0.03] px-3 py-3 text-sm text-muted-foreground transition-colors group-hover:bg-ember/[0.07]">
                  {u.email}
                </td>
                <td className="border-y border-border/60 bg-foreground/[0.03] px-3 py-3 text-sm text-muted-foreground transition-colors group-hover:bg-ember/[0.07]">
                  {u.telegram}
                </td>
                <td className="border-y border-border/60 bg-foreground/[0.03] px-3 py-3 text-sm transition-colors group-hover:bg-ember/[0.07]">
                  {u.course}
                </td>
                <td className="border-y border-border/60 bg-foreground/[0.03] px-3 py-3 transition-colors group-hover:bg-ember/[0.07]">
                  <StatusBadge status={u.status} />
                </td>
                <td className="border-y border-border/60 bg-foreground/[0.03] px-3 py-3 text-sm text-muted-foreground transition-colors group-hover:bg-ember/[0.07]">
                  {u.registeredAt || "—"}
                </td>
                <td className="border-y border-border/60 bg-foreground/[0.03] px-3 py-3 text-sm text-muted-foreground transition-colors group-hover:bg-ember/[0.07]">
                  {u.accessUntil ?? "—"}
                </td>
                <td className="rounded-r-xl border-y border-r border-border/60 bg-foreground/[0.03] px-3 py-3 text-right transition-colors group-hover:border-ember/30 group-hover:bg-ember/[0.07]">
                  <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-ember" />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <EmptyState
            className="mt-2"
            icon={UsersIcon}
            title={users.length === 0 ? "Пользователей пока нет" : "Пользователи не найдены"}
            description={
              users.length === 0
                ? "Зарегистрированные пользователи появятся здесь автоматически."
                : "Измените поисковый запрос или фильтр."
            }
          />
        )}
      </div>
    </GlassCard>
  );
}
