import { useDeferredValue, useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlockKind } from "./lesson-blocks";
import { blockDefinitions } from "./block-definitions";

const categoryLabels = {
  content: "Контент",
  hungarian: "Венгерский",
  assessment: "Проверка знаний",
} as const;

type BlockPaletteProps = {
  onAdd: (kind: BlockKind) => void;
  compact?: boolean;
};

export function BlockPalette({ onAdd, compact = false }: BlockPaletteProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("ru"));
  const filtered = blockDefinitions.filter(
    ({ label, description }) =>
      !deferredQuery ||
      label.toLocaleLowerCase("ru").includes(deferredQuery) ||
      description.toLocaleLowerCase("ru").includes(deferredQuery),
  );

  return (
    <div className={cn("space-y-4", compact && "max-h-[68vh] overflow-y-auto pr-1")}>
      <label className="relative block">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти блок…"
          aria-label="Поиск блока"
          className="h-10 w-full rounded-xl border border-border/70 bg-background/35 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ember/45"
        />
      </label>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center text-sm text-muted-foreground">
          <ListChecks className="mx-auto mb-2 h-5 w-5 opacity-60" />
          Блоки не найдены
        </div>
      ) : (
        (Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).map((category) => {
          const entries = filtered.filter((definition) => definition.category === category);
          if (!entries.length) return null;

          return (
            <section key={category}>
              <h3 className="mb-2 text-[10px] font-bold tracking-[0.16em] text-muted-foreground uppercase">
                {categoryLabels[category]}
              </h3>
              <div className={cn("grid gap-2", compact ? "grid-cols-2" : "grid-cols-1")}>
                {entries.map(({ kind, label, description, icon: Icon }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => onAdd(kind)}
                    className="group flex min-w-0 items-center gap-3 rounded-xl border border-border/65 bg-background/25 px-3 py-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-ember/35 hover:bg-ember/5 focus-visible:ring-2 focus-visible:ring-ember/40 focus-visible:outline-none"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-card/80 text-ember transition-colors group-hover:border-ember/35">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
