interface SimConfig {
  num_ticks: number;
  volatility: number;
  seed: number | null;
  initial_price: number;
  tick_delay_ms?: number;
  step_mode?: boolean;
  enabled_agents?: string[];
  difficulty?: string;
}

interface Props {
  config: SimConfig;
  setConfig: (c: SimConfig) => void;
  status: string;
  onStart: () => void;
  onStop: () => void;
  error: string | null;
  onStep?: () => void;
}

const SPEED_OPTIONS = [
  { label: "Fast (10ms)", value: 10 },
  { label: "Normal (50ms)", value: 50 },
  { label: "Slow (200ms)", value: 200 },
  { label: "Very Slow (1s)", value: 1000 },
];

const AGENT_OPTIONS = [
  { id: "mm-1", label: "Market Maker", color: "var(--blue)" },
  { id: "rt-1", label: "Random Taker 1", color: "var(--yellow)" },
  { id: "rt-2", label: "Random Taker 2", color: "var(--yellow)" },
  { id: "mom-1", label: "Momentum Trader", color: "var(--green)" },
  { id: "mr-1", label: "Mean Reversion", color: "var(--green)" },
];

const DIFFICULTY_OPTIONS = [
  { id: "", label: "Custom" },
  { id: "beginner", label: "Beginner", desc: "Gentle prices, slow pace" },
  { id: "intermediate", label: "Intermediate", desc: "Balanced volatility" },
  { id: "advanced", label: "Advanced", desc: "High volatility, fast pace" },
];

export default function ConfigPanel({
  config,
  setConfig,
  status,
  onStart,
  onStop,
  error,
  onStep,
}: Props) {
  const isRunning = status === "running" || status === "connecting";

  const parseFloatLocal = (s: string): number => {
    const normalized = s.replace(",", ".");
    const n = parseFloat(normalized);
    return isNaN(n) ? 0 : n;
  };

  const enabledAgents = config.enabled_agents ?? ["mm-1", "rt-1", "rt-2", "mom-1", "mr-1"];

  const toggleAgent = (agentId: string) => {
    const next = enabledAgents.includes(agentId)
      ? enabledAgents.filter((a) => a !== agentId)
      : [...enabledAgents, agentId];
    setConfig({ ...config, enabled_agents: next });
  };

  const setDifficulty = (difficultyId: string) => {
    setConfig({ ...config, difficulty: difficultyId || undefined });
  };

  return (
    <div className="sidebar-content">
      <div className="config-form">
        {/* Difficulty */}
        <div className="form-group">
          <label className="form-label">Difficulty</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDifficulty(opt.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: `1px solid ${(config.difficulty ?? "") === opt.id ? "var(--blue)" : "var(--border)"}`,
                  background: (config.difficulty ?? "") === opt.id ? "var(--blue-bg)" : "var(--bg-card)",
                  color: (config.difficulty ?? "") === opt.id ? "var(--blue)" : "var(--text-secondary)",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  opacity: isRunning ? 0.5 : 1,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-sans)",
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
                disabled={isRunning}
              >
                <span>{opt.label}</span>
                <span style={{ fontWeight: 400, color: "var(--text-muted)", fontSize: 11 }}>{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ticks */}
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

        {/* Volatility */}
        <div className="form-group">
          <label className="form-label">Volatility</label>
          <input
            type="number"
            className="form-input"
            value={config.volatility}
            min={0.01}
            max={10}
            step={0.1}
            disabled={isRunning || !!config.difficulty}
            onChange={(e) =>
              setConfig({ ...config, volatility: parseFloatLocal(e.target.value) || 0.5 })
            }
            placeholder={config.difficulty ? "Set by difficulty" : ""}
            style={config.difficulty ? { color: "var(--text-muted)" } : {}}
          />
        </div>

        {/* Initial Price */}
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

        {/* Seed */}
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

        {/* Speed */}
        <div className="form-group">
          <label className="form-label">Speed</label>
          <select
            className="form-input"
            value={config.tick_delay_ms ?? 10}
            disabled={isRunning || !!config.difficulty}
            onChange={(e) =>
              setConfig({ ...config, tick_delay_ms: parseInt(e.target.value) })
            }
          >
            {SPEED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Step mode */}
        <div className="form-group">
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", textTransform: "none", fontSize: 12 }}>
            <input
              type="checkbox"
              checked={config.step_mode ?? false}
              disabled={isRunning}
              onChange={(e) => setConfig({ ...config, step_mode: e.target.checked })}
              style={{ accentColor: "var(--blue)" }}
            />
            Step Mode
          </label>
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
          {isRunning ? "■ Stop" : "▶ Start Simulation"}
        </button>

        {isRunning && (config.step_mode ?? false) && (
          <button
            className="btn btn-secondary"
            style={{ width: "100%", marginTop: 4 }}
            onClick={onStep}
          >
            ▶ Step
          </button>
        )}
      </div>

      {/* Agent toggles */}
      <div>
        <div className="panel-title" style={{ marginBottom: 8 }}>Active Agents</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {AGENT_OPTIONS.map((agent) => {
            const isEnabled = enabledAgents.includes(agent.id);
            return (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                disabled={isRunning}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: `1px solid ${isEnabled ? agent.color + "40" : "var(--border)"}`,
                  background: isEnabled ? agent.color + "15" : "var(--bg-card)",
                  color: isEnabled ? "var(--text-primary)" : "var(--text-muted)",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  opacity: isRunning ? 0.5 : 1,
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: isEnabled ? agent.color : "var(--text-muted)",
                    flexShrink: 0,
                    transition: "background 0.15s",
                  }}
                />
                <span style={{ fontWeight: 600 }}>{agent.id}</span>
                <span style={{ color: "var(--text-muted)", marginLeft: "auto", fontWeight: 400 }}>
                  {agent.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
