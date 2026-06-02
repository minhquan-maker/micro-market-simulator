import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown, Activity, Zap, BarChart2 } from "lucide-react";

const AGENTS = [
  {
    id: "mm",
    label: "Market Maker",
    shortLabel: "MM",
    icon: BarChart2,
    color: "#3b82f6",
    bg: "#eff6ff",
    description:
      "Posts bid and ask quotes simultaneously around the mid price. Earns the spread on each round trip while managing inventory risk and adverse selection.",
    tags: ["Two-sided quoting", "Spread capture", "Inventory management"],
  },
  {
    id: "rt",
    label: "Random Traders",
    shortLabel: "RT1 / RT2",
    icon: Zap,
    color: "#eab308",
    bg: "#fefce8",
    description:
      "Submit orders at random intervals in random directions. They represent the aggregate effect of retail flow and statistical noise — the neutral benchmark.",
    tags: ["Uninformed flow", "Noise traders", "Liquidity provision"],
  },
  {
    id: "mom",
    label: "Momentum Trader",
    shortLabel: "MOM",
    icon: TrendingUp,
    color: "#22c55e",
    bg: "#f0fdf4",
    description:
      "Buys when prices are rising, sells when they are falling. Momentum is one of the most studied anomalies in financial economics — markets underreact to information.",
    tags: ["Trend following", "Amplifies moves", "Destabilizing"],
  },
  {
    id: "mr",
    label: "Mean Reversion",
    shortLabel: "MR",
    icon: TrendingDown,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    description:
      "Sells when the price is elevated and buys when depressed. Uses a rolling average as fair value. Profits when prices return to mean but risks drawdowns in trends.",
    tags: ["Mean reversion", "Counter-cyclical", "Drawdown risk"],
  },
  {
    id: "orderbook",
    label: "Limit Order Book",
    shortLabel: "LOB",
    icon: Activity,
    color: "#f97316",
    bg: "#fff7ed",
    description:
      "The heart of the system. Orders are matched by price-time priority (FIFO). Every trade, every quote, every spread is visible — watch price discovery in real time.",
    tags: ["FIFO matching", "Price discovery", "Bid-ask spread"],
  },
];

export default function AgentsSection() {
  return (
    <section className="bg-[#F5F5F5] pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20 lg:pb-28">
      <div className="max-w-[1440px] mx-auto">
        {/* Badge row */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8 px-5 sm:px-8 lg:px-12">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-[12px] font-semibold">2</span>
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-600">
            The Five Agents
          </span>
        </div>

        {/* Heading */}
        <h2
          className="px-5 sm:px-8 lg:px-12 font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-10 sm:mb-14 lg:mb-16"
          style={{
            fontSize: "clamp(1.75rem, 7vw, 4.2rem)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Five agents. One order book.
        </h2>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7 px-5 sm:px-8 lg:px-12">
          {AGENTS.map((agent, i) => {
            const Icon = agent.icon;
            const isFullWidth = i === 0 || i === AGENTS.length - 1;
            return (
              <div
                key={agent.id}
                className={`group bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col gap-5 ${
                  isFullWidth ? "md:col-span-2 lg:col-span-1 lg:row-span-1" : ""
                }`}
              >
                {/* Icon + label */}
                <div className="flex items-start justify-between">
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: agent.bg }}
                  >
                    <Icon size={20} strokeWidth={1.8} style={{ color: agent.color }} />
                  </div>
                  <span
                    className="text-[11px] sm:text-[12px] font-semibold px-2 sm:px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: agent.bg, color: agent.color }}
                  >
                    {agent.shortLabel}
                  </span>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-3 flex-1">
                  <h3 className="text-[15px] sm:text-[16px] font-semibold text-gray-900">
                    {agent.label}
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-gray-600 leading-relaxed">
                    {agent.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {agent.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] sm:text-[12px] text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex justify-center mt-12 sm:mt-16">
          <Link
            to="/simulate"
            className="flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] sm:text-[15px] font-medium rounded-full pl-5 sm:pl-6 pr-3 py-2.5 sm:py-3 group"
          >
            <span>Watch them interact</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center justify-center">
              <ArrowRight size={14} strokeWidth={2.5} className="text-white" />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
