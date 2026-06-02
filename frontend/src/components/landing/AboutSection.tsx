import { ArrowRight } from "lucide-react";
import TextRollButton from "./TextRollButton";

function OrderBookDiagram() {
  return (
    <svg viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Bid side */}
      <rect x="4" y="10" width="88" height="18" rx="3" fill="#22c55e" fillOpacity="0.15" />
      <rect x="4" y="10" width="70" height="18" rx="3" fill="#22c55e" fillOpacity="0.3" />
      <text x="8" y="23" fontSize="10" fill="#22c55e" fontFamily="monospace" fontWeight="bold">99.90</text>
      <text x="80" y="23" fontSize="10" fill="#22c55e" fontFamily="monospace">×12</text>

      <rect x="4" y="33" width="88" height="18" rx="3" fill="#22c55e" fillOpacity="0.1" />
      <rect x="4" y="33" width="45" height="18" rx="3" fill="#22c55e" fillOpacity="0.25" />
      <text x="8" y="46" fontSize="10" fill="#22c55e" fontFamily="monospace" fontWeight="bold">99.85</text>
      <text x="80" y="46" fontSize="10" fill="#22c55e" fontFamily="monospace">×8</text>

      <rect x="4" y="56" width="88" height="18" rx="3" fill="#22c55e" fillOpacity="0.07" />
      <rect x="4" y="56" width="25" height="18" rx="3" fill="#22c55e" fillOpacity="0.2" />
      <text x="8" y="69" fontSize="10" fill="#22c55e" fontFamily="monospace" fontWeight="bold">99.80</text>
      <text x="80" y="69" fontSize="10" fill="#22c55e" fontFamily="monospace">×5</text>

      {/* Spread indicator */}
      <rect x="96" y="28" width="8" height="44" rx="4" fill="#F26522" fillOpacity="0.3" />
      <line x1="100" y1="32" x2="100" y2="68" stroke="#F26522" strokeWidth="2" strokeDasharray="3 2" />

      {/* Ask side */}
      <rect x="108" y="10" width="88" height="18" rx="3" fill="#ef4444" fillOpacity="0.15" />
      <rect x="108" y="10" width="30" height="18" rx="3" fill="#ef4444" fillOpacity="0.3" />
      <text x="112" y="23" fontSize="10" fill="#ef4444" fontFamily="monospace" fontWeight="bold">100.10</text>
      <text x="182" y="23" fontSize="10" fill="#ef4444" fontFamily="monospace">×6</text>

      <rect x="108" y="33" width="88" height="18" rx="3" fill="#ef4444" fillOpacity="0.1" />
      <rect x="108" y="33" width="55" height="18" rx="3" fill="#ef4444" fillOpacity="0.25" />
      <text x="112" y="46" fontSize="10" fill="#ef4444" fontFamily="monospace" fontWeight="bold">100.15</text>
      <text x="182" y="46" fontSize="10" fill="#ef4444" fontFamily="monospace">×10</text>

      <rect x="108" y="56" width="88" height="18" rx="3" fill="#ef4444" fillOpacity="0.07" />
      <rect x="108" y="56" width="80" height="18" rx="3" fill="#ef4444" fillOpacity="0.2" />
      <text x="112" y="69" fontSize="10" fill="#ef4444" fontFamily="monospace" fontWeight="bold">100.20</text>
      <text x="182" y="69" fontSize="10" fill="#ef4444" fontFamily="monospace">×15</text>

      {/* Labels */}
      <text x="48" y="132" fontSize="8" fill="#22c55e" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">BID</text>
      <text x="152" y="132" fontSize="8" fill="#ef4444" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="600">ASK</text>
      <text x="100" y="132" fontSize="8" fill="#F26522" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="700">SPREAD</text>

      {/* Price label */}
      <text x="100" y="95" fontSize="11" fill="#F26522" fontFamily="monospace" textAnchor="middle" fontWeight="bold">100.00</text>
    </svg>
  );
}

function MarketDiagram() {
  return (
    <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Chart background grid */}
      {[20, 40, 60, 80, 100].map((y) => (
        <line key={y} x1="10" y1={y} x2="190" y2={y} stroke="#e5e7eb" strokeWidth="0.5" strokeDasharray="3 3" />
      ))}

      {/* Price line */}
      <polyline
        points="10,70 30,65 50,55 70,60 90,45 110,50 130,35 150,40 170,25 190,30"
        stroke="#F26522"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Fill under area */}
      <polygon
        points="10,70 30,65 50,55 70,60 90,45 110,50 130,35 150,40 170,25 190,30 190,100 10,100"
        fill="url(#marketGrad)"
        opacity="0.3"
      />

      {/* Current price dot */}
      <circle cx="190" cy="30" r="5" fill="#F26522" />
      <circle cx="190" cy="30" r="3" fill="white" />

      {/* X-axis labels */}
      <text x="10" y="115" fontSize="8" fill="#9ca3af" fontFamily="Inter, sans-serif">t=0</text>
      <text x="90" y="115" fontSize="8" fill="#9ca3af" fontFamily="Inter, sans-serif">t=5</text>
      <text x="170" y="115" fontSize="8" fill="#9ca3af" fontFamily="Inter, sans-serif">t=10</text>

      {/* Y-axis label */}
      <text x="3" y="20" fontSize="8" fill="#9ca3af" fontFamily="Inter, sans-serif">HIGH</text>
      <text x="3" y="105" fontSize="8" fill="#9ca3af" fontFamily="Inter, sans-serif">LOW</text>

      <defs>
        <linearGradient id="marketGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F26522" />
          <stop offset="100%" stopColor="#F26522" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AgentsDiagram() {
  return (
    <svg viewBox="0 0 200 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
      {/* Central order book circle */}
      <circle cx="100" cy="65" r="28" fill="#0a0e17" stroke="#F26522" strokeWidth="2" />
      <text x="100" y="61" fontSize="9" fill="#F26522" fontFamily="monospace" textAnchor="middle" fontWeight="bold">ORDER</text>
      <text x="100" y="72" fontSize="9" fill="#F26522" fontFamily="monospace" textAnchor="middle" fontWeight="bold">BOOK</text>

      {/* Connector lines */}
      <line x1="72" y1="65" x2="45" y2="35" stroke="#3b82f6" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="128" y1="65" x2="155" y2="35" stroke="#eab308" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="100" y1="37" x2="100" y2="18" stroke="#22c55e" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="72" y1="65" x2="45" y2="95" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.6" />
      <line x1="128" y1="65" x2="155" y2="95" stroke="#F26522" strokeWidth="1.5" strokeOpacity="0.6" />

      {/* MM - top */}
      <circle cx="100" cy="10" r="16" fill="#22c55e" fillOpacity="0.15" stroke="#22c55e" strokeWidth="1.5" />
      <text x="100" y="13" fontSize="8" fill="#22c55e" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="bold">MM</text>

      {/* RT1 - top left */}
      <circle cx="36" cy="27" r="14" fill="#3b82f6" fillOpacity="0.15" stroke="#3b82f6" strokeWidth="1.5" />
      <text x="36" y="30" fontSize="7" fill="#3b82f6" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="bold">RT1</text>

      {/* RT2 - top right */}
      <circle cx="164" cy="27" r="14" fill="#eab308" fillOpacity="0.15" stroke="#eab308" strokeWidth="1.5" />
      <text x="164" y="30" fontSize="7" fill="#eab308" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="bold">RT2</text>

      {/* MOM - bottom left */}
      <circle cx="36" cy="103" r="14" fill="#8b5cf6" fillOpacity="0.15" stroke="#8b5cf6" strokeWidth="1.5" />
      <text x="36" y="106" fontSize="7" fill="#8b5cf6" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="bold">MOM</text>

      {/* MR - bottom right */}
      <circle cx="164" cy="103" r="14" fill="#F26522" fillOpacity="0.15" stroke="#F26522" strokeWidth="1.5" />
      <text x="164" y="106" fontSize="7" fill="#F26522" fontFamily="Inter, sans-serif" textAnchor="middle" fontWeight="bold">MR</text>

      {/* Trades arrows */}
      <path d="M100 93 Q90 105 80 110" stroke="#F26522" strokeWidth="1" strokeOpacity="0.4" fill="none" strokeDasharray="3 2" />
      <path d="M100 93 Q110 105 120 110" stroke="#F26522" strokeWidth="1" strokeOpacity="0.4" fill="none" strokeDasharray="3 2" />
      <path d="M100 93 Q105 108 100 115" stroke="#F26522" strokeWidth="1" strokeOpacity="0.4" fill="none" strokeDasharray="3 2" />
    </svg>
  );
}

const FEATURES = [
  {
    number: "01",
    title: "What is microstructure?",
    body: "The study of how orders become trades, and trades become prices. Every bid, every ask, every fill tells a story about information, incentives, and competition.",
    visual: <OrderBookDiagram />,
    accent: "#F26522",
    bg: "#fff7ed",
  },
  {
    number: "02",
    title: "Inspired by Jane Street",
    body: "At Jane Street, rigorous understanding of microstructure is foundational. Every market maker must reason precisely about who is on the other side of each trade. This simulator distills those ideas into something you can see.",
    visual: <MarketDiagram />,
    accent: "#3b82f6",
    bg: "#eff6ff",
  },
  {
    number: "03",
    title: "Five agents, one book",
    body: "A market maker, two random traders, a momentum agent, and a mean reversion agent — all competing in a single limit order book. You control the environment. Watch the market think.",
    visual: <AgentsDiagram />,
    accent: "#22c55e",
    bg: "#f0fdf4",
  },
];

export default function AboutSection() {
  return (
    <section id="about" className="bg-white pt-16 sm:pt-20 lg:pt-32 pb-16 sm:pb-20 lg:pb-28 overflow-hidden">
      <div className="max-w-[1440px] mx-auto">
        {/* Badge row */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8 px-5 sm:px-8 lg:px-12">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-[12px] font-semibold">1</span>
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-gray-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-600">
            About the Simulator
          </span>
        </div>

        {/* Heading */}
        <h2
          className="px-5 sm:px-8 lg:px-12 font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 mb-12 sm:mb-16 lg:mb-20"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 3.2rem)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Understand how markets work —{" "}
          <span className="hidden sm:block" />
          through simulation, not speculation.
        </h2>

        {/* Three feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 px-5 sm:px-8 lg:px-12 mb-12 sm:mb-16">
          {FEATURES.map((f) => (
            <div
              key={f.number}
              className="flex flex-col gap-5 p-6 sm:p-7 rounded-2xl border border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:shadow-sm transition-all duration-300"
            >
              {/* Number + visual */}
              <div className="flex items-start justify-between gap-4">
                <span className="text-[11px] font-mono text-gray-400 font-semibold">{f.number}</span>
                <div
                  className="w-16 h-12 sm:w-20 sm:h-14 flex-shrink-0"
                  style={{ color: f.accent }}
                >
                  {f.visual}
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col gap-3 flex-1">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-gray-900 leading-snug">
                  {f.title}
                </h3>
                <p className="text-[13px] sm:text-[14px] text-gray-600 leading-relaxed">
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-5 sm:px-8 lg:px-12">
          <a
            href="#how-it-works"
            className="group inline-flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-3 py-2.5 transition-colors"
          >
            <TextRollButton>Learn about market microstructure</TextRollButton>
            <ArrowRight
              size={14}
              strokeWidth={2.5}
              className="text-white group-hover:rotate-[-45deg] transition-transform duration-500"
            />
          </a>
        </div>
      </div>
    </section>
  );
}
