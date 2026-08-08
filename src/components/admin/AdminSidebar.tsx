import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  GraduationCap,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Пользователи", icon: Users },
  { to: "/access", label: "Доступы", icon: KeyRound },
  { to: "/courses", label: "Курсы", icon: GraduationCap },
  { to: "/lessons", label: "Уроки", icon: BookOpen },
  { to: "/analytics", label: "Аналитика", icon: BarChart3 },
  { to: "/notifications", label: "Уведомления", icon: Bell },
  { to: "/settings", label: "Настройки", icon: Settings },
] as const;

export function AdminSidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.aside
      animate={{ width: collapsed ? 84 : 264 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-3xl p-3 lg:flex"
    >
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ember/30 bg-[var(--gradient-ember)] shadow-[var(--shadow-ember)]">
          <span className="font-display text-sm font-bold text-primary-foreground">H</span>
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.25 }}
              className="min-w-0"
            >
              <p className="font-display truncate text-sm font-semibold">HunMaster</p>
              <p className="text-[10px] font-bold tracking-[0.28em] text-ember">ADMIN</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1">
        {nav.map((item) => {
          const active =
            item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="absolute inset-0 rounded-xl border border-ember/25 bg-foreground/[0.06]"
                />
              )}
              <item.icon
                className={cn(
                  "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-300 group-hover:scale-110",
                  active && "text-ember",
                )}
              />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative z-10 truncate font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={onToggle}
        className="mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {collapsed ? (
          <PanelLeftOpen className="h-[18px] w-[18px]" />
        ) : (
          <PanelLeftClose className="h-[18px] w-[18px]" />
        )}
        {!collapsed && <span>Свернуть</span>}
      </button>

      <div className="rounded-2xl border border-border bg-foreground/[0.04] p-2.5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-foreground/10 text-xs font-bold">
            ЛК
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Ласло Керш</p>
              <p className="truncate text-[11px] text-muted-foreground">Администратор</p>
            </div>
          )}
        </div>
        <button
          className={cn(
            "mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Выйти</span>}
        </button>
      </div>
    </motion.aside>
  );
}

export function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="glass-panel sticky top-2 z-30 -mx-1 mb-4 flex gap-1 overflow-x-auto rounded-2xl p-1.5 lg:hidden">
      {nav.map((item) => {
        const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors",
              active
                ? "border border-ember/25 bg-foreground/[0.07] text-foreground"
                : "text-muted-foreground",
            )}
          >
            <item.icon className={cn("h-4 w-4", active && "text-ember")} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}