import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { UserStatus } from "@/lib/data";
import { statusLabels } from "@/lib/data";

const styles: Record<UserStatus, string> = {
  active: "text-jade border-jade/35 bg-jade/10",
  pending: "text-ember border-ember/35 bg-ember/10",
  expired: "text-muted-foreground border-border bg-foreground/5",
  blocked: "text-destructive border-destructive/40 bg-destructive/10",
};

export function StatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  return (
    <motion.span
      key={status}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.14em] uppercase",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </motion.span>
  );
}
