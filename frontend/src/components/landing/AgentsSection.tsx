import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp, TrendingDown, Activity, Zap, BarChart2, ChevronDown } from "lucide-react";

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
    behavior:
      "Every tick, the MM quotes at mid ± half-spread. As its inventory grows (holding more of one side), it widens its quotes to reduce risk. It cancels and requotes every tick.",
    decisionLogic: "Quote: bid = mid − spread/2, ask = mid + spread/2. Inventory adjustment: spread widens as |inventory| increases.",
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
      "Submit market orders at random intervals in random directions. They represent the aggregate effect of retail flow and statistical noise — the neutral benchmark.",
    behavior:
      "Each tick, with a fixed probability (8% and 6% respectively), a random trader submits a market order of random size (1–15 shares) in a random direction (50/50 buy/sell).",
    decisionLogic: "Probabilistic: if random() < action_prob, submit MARKET ORDER, random side, random quantity in [min_qty, max_qty].",
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
    behavior:
      "Tracks a rolling 10-tick price history. Computes the return over that window. If the return exceeds the momentum threshold, it buys at the best ask. If the return is below negative threshold, it sells at the best bid.",
    decisionLogic: "Return = (price[−1] − price[0]) / price[0]. If return > +threshold → BUY at best_ask + 0.01. If return < −threshold → SELL at best_bid − 0.01.",
    tags: ["Trend following", "Amplifies moves", "Destabilizing"],
  },
  {
    id: "mr",
    label: "Mean Reversion Trader",
    shortLabel: "MR",
    icon: TrendingDown,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    description:
      "Sells when the price is elevated and buys when depressed. Uses a rolling average as fair value. Profits when prices return to mean but risks drawdowns in trends.",
    behavior:
      "Tracks a rolling 20-tick VWAP. Computes deviation from fair value. If price is significantly above VWAP, it sells at the best bid. If price is below VWAP, it buys at the best ask.",
    decisionLogic: "Deviation = price − VWAP(window). If deviation > +threshold → SELL at best_bid. If deviation < −threshold → BUY at best_ask.",
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
    behavior:
      "The LOB maintains all resting orders sorted by price. Best bid is the highest buy price; best ask is the lowest sell price. The spread is the gap between them. FIFO matching means the oldest order at a price level trades first.",
    decisionLogic: "Best bid = max price in bid book. Best ask = min price in ask book. Spread = best ask − best bid. Mid = (best bid + best ask) / 2.",
    tags: ["FIFO matching", "Price discovery", "Bid-ask spread"],
  },
];

function AgentCard({ agent }: { agent: (typeof AGENTS)[0] }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = agent.icon;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col gap-5 border border-gray-100">
      {/* Icon + label */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: agent.bg }}
        >
          <Icon size={20} strokeWidth={1.8} style={{ color: agent.color }} />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] sm:text-[12px] font-semibold px-2.5 py-0.5 rounded-full"
            style={{ backgroundColor: agent.bg, color: agent.color }}
          >
            {agent.shortLabel}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200 hover:bg-gray-200 cursor-pointer"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              size={12}
              strokeWidth={2.5}
              className={`text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-3 flex-1">
        <h3 className="text-[15px] sm:text-[16px] font-semibold text-gray-900">
          {agent.label}
        </h3>
        <p className="text-[13px] sm:text-[14px] text-gray-600 leading-relaxed">
          {agent.description}
        </p>

        {/* Expanded detail */}
        {expanded && (
          <div className="flex flex-col gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Behavior
              </p>
              <p className="text-[12px] sm:text-[13px] text-gray-600 leading-relaxed">
                {agent.behavior}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Decision Logic
              </p>
              <code className="block text-[11px] sm:text-[12px] font-mono text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed">
                {agent.decisionLogic}
              </code>
            </div>
          </div>
        )}
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
}

export default function AgentsSection() {
  return (
    <section id="agents" className="bg-[#F5F5F5] pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20 lg:pb-28">
      <div className="max-w-[1440px] mx-auto">
        {/* Badge row */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8 px-5 sm:px-8 lg:px-12">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-[12px] font-semibold">3</span>
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-600">
            The Five Agents
          </span>
        </div>

        {/* Heading */}
        <h2
          className="px-5 sm:px-8 lg:px-12 font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-4"
          style={{
            fontSize: "clamp(1.75rem, 7vw, 4.2rem)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Five agents. One order book.
        </h2>
        <p className="px-5 sm:px-8 lg:px-12 text-[14px] sm:text-[15px] text-gray-500 mb-10 sm:mb-14 lg:mb-16 max-w-2xl">
          Each agent follows a distinct strategy. Click the arrow on any card to see the
          exact decision logic behind their trades.
        </p>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7 px-5 sm:px-8 lg:px-12">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12 sm:mt-16 px-5 sm:px-8 lg:px-12">
          <Link
            to="/simulate"
            className="flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] sm:text-[15px] font-medium rounded-full pl-5 sm:pl-6 pr-3 py-2.5 sm:py-3 group"
          >
            Watch them interact
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center justify-center">
              <ArrowRight size={14} strokeWidth={2.5} className="text-white" />
            </div>
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 text-[#F26522] text-[14px] sm:text-[15px] font-medium hover:underline"
          >
            Learn how they interact
            <ArrowRight size={14} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
