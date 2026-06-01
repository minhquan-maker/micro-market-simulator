import type { TraderPnL } from "../types";

interface Props {
  mmResult: { pnl: number; position: number } | null;
  traderPnL: TraderPnL[];
}

export default function PnLDashboard({ mmResult, traderPnL }: Props) {
  return (
    <div className="panel-header">
      <span className="panel-title">P&L</span>
      <div style={{ display: "flex", gap: 8 }}>
        {traderPnL.map((t) => (
          <div key={t.id} style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{t.id}</span>:{" "}
            <span style={{ color: t.realized >= 0 ? "var(--green)" : "var(--red)" }}>
              {t.realized >= 0 ? "+" : ""}{t.realized.toFixed(0)}
            </span>
          </div>
        ))}
        {mmResult && (
          <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, color: "var(--blue)" }}>mm-1</span>:{" "}
            <span style={{ color: mmResult.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
              {mmResult.pnl >= 0 ? "+" : ""}{mmResult.pnl.toFixed(0)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
