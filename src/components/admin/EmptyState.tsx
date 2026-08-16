import type { ComponentType } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-foreground/[0.02] px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-foreground/[0.05] text-ember">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-display text-sm font-semibold">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
    </motion.div>
  );
}
