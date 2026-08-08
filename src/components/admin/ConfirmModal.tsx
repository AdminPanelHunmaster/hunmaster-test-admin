import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle } from "lucide-react";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel relative w-full max-w-md rounded-2xl p-6"
          >
            <div className="flex items-start gap-3">
              <span
                className={
                  destructive
                    ? "rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-destructive"
                    : "rounded-xl border border-ember/40 bg-ember/10 p-2 text-ember"
                }
              >
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                Отмена
              </button>
              <button
                onClick={onConfirm}
                className={
                  destructive
                    ? "rounded-xl border border-destructive/50 bg-destructive/20 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/30"
                    : "rounded-xl border border-ember/40 bg-[var(--gradient-ember)] px-4 py-2 text-sm font-semibold text-primary-foreground"
                }
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}