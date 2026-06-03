import { Link } from "react-router-dom";
import { ArrowRight, BarChart2, TrendingUp, Layers, Activity } from "lucide-react";

const SIMULATIONS = [
  {
    id: "microstructure",
    title: "Market Microstructure",
    description: "Watch 5 agents compete in a live order book — observe price discovery, spreads, and fills in real-time.",
    icon: BarChart2,
    tags: ["Order Book", "5 Agents", "Price Discovery"],
    color: "#38bdf8",
  },
  {
    id: "orderbook",
    title: "Order Book Dynamics",
    description: "Explore how orders queue, match, and shape the book — depth, FIFO matching, and price levels.",
    icon: Layers,
    tags: ["Queue Theory", "FIFO", "Depth"],
    color: "#fb923c",
  },
  {
    id: "marketmaking",
    title: "Market Making",
    description: "Learn how market makers capture the spread while managing inventory risk and adverse selection.",
    icon: TrendingUp,
    tags: ["Spread Capture", "Inventory", "Quoting"],
    color: "#34d399",
  },
  {
    id: "volatility",
    title: "Volatility Explorer",
    description: "Simulate how volatility drives spreads, order flow, and agent behavior across market regimes.",
    icon: Activity,
    tags: ["Volatility", "Risk", "Market Regimes"],
    color: "#c084fc",
  },
];

export default function SimulatorSelector() {
  return (
    <section className="py-24 px-6 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 mb-4">
            Market Education Platform
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
            Explore Simulations
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose a simulation type to dive deeper into market mechanics. Each module focuses on a different aspect of how financial markets work.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SIMULATIONS.map((sim) => {
            const Icon = sim.icon;
            return (
              <div
                key={sim.id}
                className="group bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-black/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${sim.color}20` }}
                  >
                    <Icon size={24} style={{ color: sim.color }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {sim.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      {sim.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-5">
                  {sim.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  to={`/simulate/${sim.id}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors group/link"
                  style={{ color: sim.color }}
                >
                  Start Simulation
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover/link:translate-x-1"
                  />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
