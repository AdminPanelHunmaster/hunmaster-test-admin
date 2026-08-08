import { useEffect, useState, type ComponentType } from "react";
import { motion, useInView, animate } from "motion/react";
import { useRef } from "react";
import { GlassCard } from "./GlassCard";
import { cn } from "@/lib/utils";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, value]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
  hint,
  index = 0,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  tone?: "default" | "ember" | "jade" | "danger" | "muted";
  hint?: string;
  index?: number;
}) {
  const toneRing = {
    default: "text-foreground/80",
    ember: "text-ember",
    jade: "text-jade",
    danger: "text-destructive",
    muted: "text-muted-foreground",
  }[tone];

  return (
    <GlassCard
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="group/card p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          {label}
        </p>
        <span
          className={cn(
            "rounded-xl border border-border/70 bg-foreground/5 p-2 transition-transform duration-500 group-hover/card:scale-110",
            toneRing,
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-6 flex items-baseline gap-2">
        <AnimatedNumber
          value={value}
          className={cn("font-display text-4xl leading-none font-semibold", toneRing)}
        />
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      <motion.div
        className="mt-5 h-px w-full origin-left bg-gradient-to-r from-ember/60 to-transparent"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.2 + index * 0.06 }}
      />
    </GlassCard>
  );
}