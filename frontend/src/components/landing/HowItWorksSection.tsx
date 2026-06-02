import { ArrowRight, Zap, BookOpen, TrendingUp, BarChart2, RefreshCw } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Zap,
    color: "#F26522",
    bg: "#fff7ed",
    title: "Agents Submit Orders",
    description:
      "Five automated trading agents submit buy and sell orders into the market. Each follows a different strategy — some chase trends, others provide liquidity.",
  },
  {
    number: "02",
    icon: BookOpen,
    color: "#3b82f6",
    bg: "#eff6ff",
    title: "Orders Enter the Book",
    description:
      "All orders are recorded in the limit order book, sorted by price. Bid orders stack on one side, ask orders on the other. The best bid and best ask define the market.",
  },
  {
    number: "03",
    icon: BarChart2,
    color: "#22c55e",
    bg: "#f0fdf4",
    title: "Matching Engine Executes",
    description:
      "When a buy order meets or exceeds the best ask, or a sell order meets or falls below the best bid, the matching engine pairs them. Price-time priority (FIFO) determines who trades first.",
  },
  {
    number: "04",
    icon: TrendingUp,
    color: "#8b5cf6",
    bg: "#f5f3ff",
    title: "Price Discovery Emerges",
    description:
      "From the continuous flow of buy and sell orders, a market price emerges. The mid price — the midpoint between best bid and best ask — represents the consensus value at any moment.",
  },
  {
    number: "05",
    icon: RefreshCw,
    color: "#eab308",
    bg: "#fefce8",
    title: "Market Evolves",
    description:
      "Every tick, the latent price random-walks, agents react, new orders arrive, and the order book reshapes. Supply and demand, competition, and information create dynamic price behavior.",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="bg-[#0a0e17] pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-20 lg:pb-28"
    >
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Badge */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#F26522] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-[12px] font-semibold">2</span>
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-white/20 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-white/60">
            How the Market Works
          </span>
        </div>

        {/* Heading */}
        <h2
          className="font-medium leading-[1.08] tracking-[-0.03em] text-white mb-12 sm:mb-16 lg:mb-20"
          style={{
            fontSize: "clamp(1.75rem, 6vw, 3.8rem)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Five steps from order to
          <br />
          <span className="text-[#F26522]">price discovery.</span>
        </h2>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 lg:gap-6">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative flex flex-col gap-5 bg-white/5 rounded-2xl p-6 sm:p-7 border border-white/10 hover:border-white/20 transition-colors duration-300"
              >
                {/* Step number + icon */}
                <div className="flex items-start justify-between">
                  <span className="text-[11px] font-mono text-white/30">{step.number}</span>
                  <div
                    className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: step.bg }}
                  >
                    <Icon size={18} strokeWidth={1.8} style={{ color: step.color }} />
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-3 flex-1">
                  <h3 className="text-[15px] sm:text-[16px] font-semibold text-white leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-white/50 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Connector arrow (desktop only, between cards) */}
                {i < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10">
                    <ArrowRight
                      size={16}
                      strokeWidth={1.5}
                      className="text-white/20"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom callout */}
        <div className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 sm:p-8 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex-1">
            <p className="text-[15px] sm:text-[16px] text-white/70 leading-relaxed">
              This cycle repeats every tick — thousands of times per simulation. Watch it
              happen live in the simulator below.
            </p>
          </div>
          <a
            href="#agents"
            className="flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full px-5 sm:px-6 pr-3 py-2 sm:py-2.5 whitespace-nowrap transition-colors"
          >
            Meet the agents
            <ArrowRight size={14} strokeWidth={2.5} />
          </a>
        </div>
      </div>
    </section>
  );
}
