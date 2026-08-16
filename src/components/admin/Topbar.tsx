import { Search, Bell, Command } from "lucide-react";
import { motion } from "motion/react";

export function Topbar({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string | undefined;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="glass-panel mb-6 flex flex-col gap-4 rounded-2xl px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between"
    >
      <div className="min-w-0">
        <h1 className="font-display truncate text-xl font-semibold sm:text-2xl">{title}</h1>
        {subtitle && (
          <p className="mt-1 truncate text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 md:w-64 md:flex-none">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Быстрый поиск..."
            className="h-10 w-full rounded-xl border border-border bg-foreground/[0.04] pr-10 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/40"
          />
          <Command className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        </div>
        <button className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-foreground/[0.04] text-muted-foreground transition-colors hover:border-ember/40 hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>
      </div>
    </motion.header>
  );
}