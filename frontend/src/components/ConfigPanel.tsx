interface SimConfig {
  num_ticks: number;
  volatility: number;
  seed: number | null;
  initial_price: number;
}

interface Props {
  config: SimConfig;
  setConfig: (c: SimConfig) => void;
  status: string;
  onStart: () => void;
  onStop: () => void;
  error: string | null;
}

export default function ConfigPanel({
  config,
  setConfig,
  status,
  onStart,
  onStop,
  error,
}: Props) {
  const isRunning = status === "running" || status === "connecting";

  // Parse float locale-independently: "0,5" → 0.5, "0.5" → 0.5
  const parseFloatLocal = (s: string): number => {
    const normalized = s.replace(",", ".");
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  };

  return (
    <div className="sidebar-content">
      <div className="config-form">
        <div className="form-group">
          <label className="form-label">Ticks</label>
          <input
            type="number"
            className="form-input"
            value={config.num_ticks}
            min={10}
            max={5000}
            disabled={isRunning}
            onChange={(e) =>
              setConfig({ ...config, num_ticks: parseInt(e.target.value) || 100 })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Volatility</label>
          <input
            type="number"
            className="form-input"
            value={config.volatility}
            min={0.01}
            max={10}
            step={0.1}
            disabled={isRunning}
            onChange={(e) =>
              setConfig({ ...config, volatility: parseFloatLocal(e.target.value) || 0.5 })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Initial Price</label>
          <input
            type="number"
            className="form-input"
            value={config.initial_price}
            min={1}
            step={1}
            disabled={isRunning}
            onChange={(e) =>
              setConfig({ ...config, initial_price: parseFloatLocal(e.target.value) || 100 })
            }
          />
        </div>

        <div className="form-group">
          <label className="form-label">Seed (leave blank for random)</label>
          <input
            type="number"
            className="form-input"
            value={config.seed ?? ""}
            placeholder="42"
            disabled={isRunning}
            onChange={(e) =>
              setConfig({
                ...config,
                seed: e.target.value ? parseInt(e.target.value) : null,
              })
            }
          />
        </div>

        {error && (
          <div style={{ color: "var(--red)", fontSize: 12, padding: "8px", background: "var(--red-bg)", borderRadius: 6, border: "1px solid var(--red-dim)" }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-primary"
          style={{ width: "100%", marginTop: 4 }}
          onClick={isRunning ? onStop : onStart}
        >
          {isRunning ? "■ Stop Simulation" : "▶ Start Simulation"}
        </button>
      </div>

      <div>
        <div className="panel-title" style={{ marginBottom: 8 }}>Simulation Agents</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { id: "mm-1", label: "Market Maker", color: "var(--blue)" },
            { id: "rt-1", label: "Random Taker", color: "var(--yellow)" },
            { id: "rt-2", label: "Random Taker 2", color: "var(--yellow)" },
            { id: "mom-1", label: "Momentum Trader", color: "var(--green)" },
            { id: "mr-1", label: "Mean Reversion", color: "var(--green)" },
          ].map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: agent.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontWeight: 600 }}>{agent.id}</span>
              <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{agent.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
