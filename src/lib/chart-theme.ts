export const chartTooltipStyle = {
  cursor: { stroke: "var(--ember)", strokeOpacity: 0.25 },
  contentStyle: {
    background: "color-mix(in oklab, var(--card) 88%, transparent)",
    border: "1px solid var(--glass-border)",
    borderRadius: "12px",
    backdropFilter: "blur(18px)",
    color: "var(--foreground)",
    fontSize: "12px",
    boxShadow: "var(--shadow-glass)",
  },
  labelStyle: { color: "var(--muted-foreground)", fontSize: "11px" },
  itemStyle: { color: "var(--foreground)" },
} as const;
