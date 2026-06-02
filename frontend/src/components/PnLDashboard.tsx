import type { TraderPnL, AgentPosition, AnalyticsMetrics } from "../types";

interface Props {
  mmResult: { pnl: number; position: number; unrealized?: number } | null;
  traderPnL: TraderPnL[];
  livePositions?: Record<string, AgentPosition>;
  analytics?: Record<string, AnalyticsMetrics>;
}

function fmt(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function fmtPct(value: number): string {
  return value >= 0 ? `+${(value * 100).toFixed(1)}%` : `${(value * 100).toFixed(1)}%`;
}

function MetricCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
        {value}{unit ? <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> {unit}</span> : null}
      </span>
    </div>
  );
}

function AnalyticsSection({ analytics }: { analytics: Record<string, AnalyticsMetrics> }) {
  const overall = analytics["_overall"];
  if (!overall) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div className="pnl-card-title">Analytics (Overall)</div>
      <MetricCard label="Sharpe Ratio" value={overall.sharpe_ratio.toFixed(2)} />
      <MetricCard label="Max Drawdown" value={fmt(overall.max_drawdown)} />
      <MetricCard label="Win Rate" value={fmtPct(overall.win_rate)} />
      <MetricCard label="Profit Factor" value={overall.profit_factor.toFixed(2)} />
      <MetricCard label="Avg Trade PnL" value={fmt(overall.avg_trade_pnl)} />
      <MetricCard label="Total PnL" value={fmt(overall.total_pnl)} />
    </div>
  );
}

export default function PnLDashboard({ mmResult, traderPnL, livePositions = {}, analytics }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="panel-header">
        <span className="panel-title">P&L</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {/* MM card */}
        {mmResult && (
          <div className="pnl-card" style={{ borderLeft: "3px solid var(--blue)" }}>
            <div className="pnl-card-title">Market Maker</div>
            <div className="pnl-card-value" style={{ color: mmResult.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
              {fmt(mmResult.pnl)}
            </div>
            <div className="pnl-card-meta">
              <span>Pos: {mmResult.position}</span>
              {mmResult.unrealized !== undefined && mmResult.unrealized !== 0 && (
                <span style={{ color: mmResult.unrealized >= 0 ? "var(--green)" : "var(--red)", opacity: 0.8 }}>
                  Unreal: {fmt(mmResult.unrealized)}
                </span>
              )}
            </div>
            {/* Phase 3.1: Live MM position */}
            {livePositions["mm-1"] && (
              <div className="pnl-card-meta" style={{ marginTop: 2 }}>
                <span style={{ fontSize: 10 }}>Live Pos: {livePositions["mm-1"].position}</span>
              </div>
            )}
          </div>
        )}

        {/* Trader cards */}
        {traderPnL.map((t) => (
          <div key={t.id} className="pnl-card">
            <div className="pnl-card-title">{t.id}</div>
            <div className="pnl-card-value" style={{ color: t.realized >= 0 ? "var(--green)" : "var(--red)" }}>
              {fmt(t.realized)}
            </div>
            <div className="pnl-card-meta">
              <span>Pos: {t.position}</span>
              {t.unrealized !== 0 && (
                <span style={{ color: t.unrealized >= 0 ? "var(--green)" : "var(--red)", opacity: 0.8 }}>
                  Unreal: {fmt(t.unrealized)}
                </span>
              )}
            </div>
            {/* Phase 3.1: Live position during sim */}
            {livePositions[t.id] && (
              <div className="pnl-card-meta" style={{ marginTop: 2 }}>
                <span style={{ fontSize: 10 }}>Live Pos: {livePositions[t.id].position}</span>
              </div>
            )}
            {/* Phase 3.2: Analytics for this trader */}
            {analytics && analytics[t.id] && (
              <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 8px" }}>
                  <MetricCard label="Sharpe" value={analytics[t.id].sharpe_ratio.toFixed(2)} />
                  <MetricCard label="Win%" value={fmtPct(analytics[t.id].win_rate)} />
                  <MetricCard label="PF" value={analytics[t.id].profit_factor.toFixed(2)} />
                  <MetricCard label="Avg PnL" value={fmt(analytics[t.id].avg_trade_pnl)} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Phase 3.2: Overall analytics */}
        {analytics && <AnalyticsSection analytics={analytics} />}

        {(!mmResult && traderPnL.length === 0) && (
          <div className="empty-state" style={{ padding: 24 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No P&L data yet</div>
          </div>
        )}
      </div>
    </div>
  );
}
