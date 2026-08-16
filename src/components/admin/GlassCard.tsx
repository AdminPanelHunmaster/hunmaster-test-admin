import { useRef, type ReactNode } from "react";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

type GlassCardProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  interactive?: boolean;
};

export function GlassCard({ children, className, interactive = true, ...props }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      onPointerMove={(e) => {
        if (!interactive || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
      }}
      className={cn(
        "glass-panel relative overflow-hidden rounded-2xl",
        interactive && "glass-hover",
        className,
      )}
      {...props}
    >
      {interactive && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background:radial-gradient(18rem_18rem_at_var(--mx,50%)_var(--my,0%),color-mix(in_oklab,var(--ember)_16%,transparent),transparent_70%)] group-hover/card:opacity-100 hover:opacity-100"
        />
      )}
      {children}
    </motion.div>
  );
}
