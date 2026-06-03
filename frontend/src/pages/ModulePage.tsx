import { useParams, Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, Clock, BarChart2, GitMerge, Zap, Minimize2, Layers, TrendingUp, Activity, Shield, AlertTriangle, Flame } from "lucide-react";
import Nav from "../components/landing/Nav";
import TextRollButton from "../components/landing/TextRollButton";

type ModuleType = "microstructure" | "orderbook" | "marketmaking" | "volatility";

const MODULE_DATA: Record<ModuleType, {
  title: string;
  subtitle: string;
  goal: string;
  time: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  accentColor: string;
  accentLight: string;
  bgGradient: string;
  whyThisMatters: { heading: string; paragraphs: string[] };
  keyConcepts: { title: string; icon: ReactNode; description: string }[];
  learningOutcomes: string[];
  diagramType: ModuleType;
  simRoute: string;
}> = {
  microstructure: {
    title: "Market Microstructure",
    subtitle: "How orders become trades, and trades become prices",
    goal: "Understand how prices emerge from competition between market participants",
    time: "5-10 min",
    difficulty: "Beginner",
    accentColor: "#3b82f6",
    accentLight: "#dbeafe",
    bgGradient: "bg-gradient-to-br from-[#0a1628] via-[#0f1f35] to-[#0a1628]",
    whyThisMatters: {
      heading: "Prices don't appear from nowhere",
      paragraphs: [
        "Every financial price you see — on your phone, on a Bloomberg terminal, in a newspaper — is the outcome of a hidden competition. Someone is willing to buy at 99.90. Someone else is willing to sell at 100.10. The space between them, the bid-ask spread, is where markets breathe.",
        "Market microstructure studies this invisible machinery. It asks: who places orders, why, and what happens when they collide? The answer shapes everything from your broker's commission to the flash crash of 2010.",
        "In this module, you'll watch five automated agents — a market maker, momentum traders, mean reversion traders — compete inside a live limit order book. You'll see prices form in real-time, driven entirely by the rules of the market, not by any external force.",
      ],
    },
    keyConcepts: [
      { title: "Price Discovery", icon: <TrendingUp size={20} />, description: "The process by which buyers and sellers reach a consensus price through competition." },
      { title: "Bid-Ask Spread", icon: <Minimize2 size={20} />, description: "The gap between the highest bid and lowest ask — the cost of immediacy." },
      { title: "Trade Matching", icon: <GitMerge size={20} />, description: "How exchanges pair incoming orders with resting orders using FIFO queue logic." },
      { title: "Information Flow", icon: <Zap size={20} />, description: "How private information from trades gradually gets incorporated into prices." },
    ],
    learningOutcomes: [
      "Explain how a limit order book works and why it matters",
      "Describe the role of the market maker in providing liquidity",
      "Understand how prices adjust when new information arrives",
      "Recognize the relationship between spread width and market uncertainty",
    ],
    diagramType: "microstructure",
    simRoute: "/simulate/microstructure",
  },
  orderbook: {
    title: "Order Book Dynamics",
    subtitle: "Queue, FIFO matching, and the anatomy of an exchange",
    goal: "Understand what happens to an order after you submit it",
    time: "10-15 min",
    difficulty: "Intermediate",
    accentColor: "#f59e0b",
    accentLight: "#fef3c7",
    bgGradient: "bg-gradient-to-br from-[#1a1400] via-[#1f1a05] to-[#0f1a00]",
    whyThisMatters: {
      heading: "Your order doesn't just disappear into a black box",
      paragraphs: [
        "When you submit a market order, something very specific happens. The exchange looks at the order book — a living list of every waiting order — and finds the best price where a seller is willing to meet you. The order at the front of the queue gets filled first. That's FIFO: First In, First Out.",
        "The order book is a queueing system. Each price level is a line. Each order is a person. Position matters enormously — being first in line at a price can mean the difference between a profitable fill and a missed trade.",
        "In this module, you'll watch orders queue in real-time, observe queue position changes as trades execute, and see how the shape of the book — flat, sloped, or steep — predicts short-term price direction.",
      ],
    },
    keyConcepts: [
      { title: "FIFO Matching", icon: <GitMerge size={20} />, description: "First-In, First-Out queue logic — the earliest order at a price level gets filled first." },
      { title: "Queue Position", icon: <Layers size={20} />, description: "Where you stand in line at a price level — position determines fill priority." },
      { title: "Price-Time Priority", icon: <Clock size={20} />, description: "Exchange rule: best price first, then earliest time at equal prices." },
      { title: "Order Book Shape", icon: <BarChart2 size={20} />, description: "The visual fingerprint of supply and demand — tilted books predict directional pressure." },
    ],
    learningOutcomes: [
      "Explain how FIFO matching works and why it creates incentives for early order placement",
      "Understand queue position and how it affects fill probability",
      "Read the shape of an order book and predict short-term price direction",
      "Distinguish between market orders and limit orders and when each is appropriate",
    ],
    diagramType: "orderbook",
    simRoute: "/simulate/orderbook",
  },
  marketmaking: {
    title: "Market Making",
    subtitle: "Earn the spread, manage the risk",
    goal: "Think like a liquidity provider — capture gains while controlling inventory",
    time: "15-20 min",
    difficulty: "Advanced",
    accentColor: "#10b981",
    accentLight: "#d1fae5",
    bgGradient: "bg-gradient-to-br from-[#0a1f15] via-[#0f2518] to-[#051a0f]",
    whyThisMatters: {
      heading: "The market maker's paradox",
      paragraphs: [
        "A market maker posts two prices simultaneously: a bid (where they'll buy) and an ask (where they'll sell). The gap between them is the spread — their revenue. Every time someone crosses the spread, the market maker earns a small profit.",
        "But the job isn't free money. If the market maker buys too much, they're holding inventory they didn't want. If prices move against their inventory, they lose. And if they're on the wrong side of an informed trader — someone who knows something the market maker doesn't — they get 'adverse selected' and lose on every trade.",
        "In this module, you'll observe a market maker posting quotes in real-time. Watch how they adjust their spread when volatility rises, how they manage their inventory by skewing quotes, and what happens when informed traders arrive.",
      ],
    },
    keyConcepts: [
      { title: "Spread Capture", icon: <Minimize2 size={20} />, description: "Earning the bid-ask spread on each round-trip trade as the market maker." },
      { title: "Inventory Risk", icon: <Shield size={20} />, description: "The danger of holding a position that moves against you before you can offset it." },
      { title: "Adverse Selection", icon: <AlertTriangle size={20} />, description: "When informed traders systematically trade against the market maker's inventory." },
      { title: "Quote Skew", icon: <TrendingUp size={20} />, description: "Adjusting bid and ask prices asymmetrically to manage inventory direction." },
    ],
    learningOutcomes: [
      "Understand the economics of market making: why the spread is both revenue and compensation for risk",
      "Explain inventory risk and how market makers use quote skew to manage it",
      "Recognize adverse selection and how it erodes market maker profitability",
      "Design a basic quote strategy that balances spread capture against inventory exposure",
    ],
    diagramType: "marketmaking",
    simRoute: "/simulate/marketmaking",
  },
  volatility: {
    title: "Volatility Explorer",
    subtitle: "How uncertainty reshapes market behavior",
    goal: "Observe how volatility regimes change every aspect of market microstructure",
    time: "10-15 min",
    difficulty: "Intermediate",
    accentColor: "#a855f7",
    accentLight: "#f3e8ff",
    bgGradient: "bg-gradient-to-br from-[#130a20] via-[#1a0f28] to-[#0a0618]",
    whyThisMatters: {
      heading: "Markets don't breathe at a constant rate",
      paragraphs: [
        "In calm markets, spreads are tight, order books are deep, and prices drift lazily. In crisis markets, spreads blow out, liquidity vanishes, and prices jump erratically. The same market, the same participants — just different volatility regimes.",
        "Volatility is measured in many ways: historical realized volatility, implied volatility from options, or the VIX fear index. But the simplest signal is often the bid-ask spread — market makers widen it when they're uncertain, charging more for the insurance of immediacy.",
        "In this module, you'll push the simulation through different volatility regimes. Watch spreads widen as uncertainty rises. Observe how agents adapt their behavior. See the market transform from calm to turbulent and back again.",
      ],
    },
    keyConcepts: [
      { title: "Volatility Regimes", icon: <Activity size={20} />, description: "Market states — calm, trending, volatile, crisis — each with distinct microstructure behavior." },
      { title: "Spread Widening", icon: <Flame size={20} />, description: "How market makers increase spreads as compensation for heightened uncertainty." },
      { title: "Liquidity Stress", icon: <Shield size={20} />, description: "The breakdown of normal market functioning under extreme volatility conditions." },
      { title: "Regime Transitions", icon: <TrendingUp size={20} />, description: "How markets shift between volatility states and why transitions are hard to predict." },
    ],
    learningOutcomes: [
      "Identify how volatility regimes affect spread width, order book depth, and agent behavior",
      "Explain why market makers widen spreads during periods of uncertainty",
      "Understand the relationship between realized volatility and liquidity provision",
      "Recognize early warning signals of regime transitions in live market data",
    ],
    diagramType: "volatility",
    simRoute: "/simulate/volatility",
  },
};

const DEFAULT_MODULE: ModuleType = "microstructure";

function OrderBookDiagram() {
  return (
    <svg viewBox="0 0 600 280" className="w-full max-w-2xl" fill="none">
      <rect width="600" height="280" rx="12" fill="#111827" />
      <text x="20" y="24" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600" letterSpacing="0.08em">ORDER BOOK SNAPSHOT</text>
      <line x1="300" y1="44" x2="300" y2="270" stroke="#1e293b" strokeWidth="1" />
      <text x="20" y="55" fill="#4ade80" fontSize="10" fontFamily="monospace" fontWeight="700">BID</text>
      <text x="310" y="55" fill="#f87171" fontSize="10" fontFamily="monospace" fontWeight="700">ASK</text>
      {[[100.20, 15], [100.15, 10], [100.10, 6], [100.05, 4]].map(([price, qty], i) => (
        <g key={price}>
          <rect x={20} y={64 + i * 38} width={Math.min(qty * 10, 200)} height="26" rx="4" fill="#14532d" opacity={0.9 - i * 0.15} />
          <text x={24} y={81 + i * 38} fill="#4ade80" fontSize="12" fontFamily="monospace">{price.toFixed(2)}</text>
          <text x={140} y={81 + i * 38} fill="#4ade80" fontSize="11" fontFamily="monospace" opacity={0.7}>×{qty}</text>
        </g>
      ))}
      <rect x={230} y={100} width="60" height="26" rx="4" fill="#1e293b" />
      <text x="260" y="118" fill="#e2e8f0" fontSize="13" fontFamily="monospace" fontWeight="700" textAnchor="middle">100.00</text>
      {[[99.95, 4], [99.90, 6], [99.85, 10], [99.80, 15]].map(([price, qty], i) => (
        <g key={price}>
          <rect x={300} y={64 + i * 38} width={Math.min(qty * 10, 200)} height="26" rx="4" fill="#7f1d1d" opacity={0.9 - i * 0.15} />
          <text x={304} y={81 + i * 38} fill="#f87171" fontSize="12" fontFamily="monospace">{price.toFixed(2)}</text>
          <text x={424} y={81 + i * 38} fill="#f87171" fontSize="11" fontFamily="monospace" opacity={0.7}>×{qty}</text>
        </g>
      ))}
    </svg>
  );
}

function SpreadDiagram() {
  return (
    <svg viewBox="0 0 600 220" className="w-full max-w-2xl" fill="none">
      <rect width="600" height="220" rx="12" fill="#111827" />
      <text x="20" y="24" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="600" letterSpacing="0.08em">BID-ASK SPREAD FORMATION</text>
      <line x1="300" y1="60" x2="300" y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
      <rect x="80" y="80" width="200" height="50" rx="6" fill="#14532d" opacity="0.8" />
      <text x="180" y="100" fill="#4ade80" fontSize="11" fontFamily="monospace" fontWeight="600" textAnchor="middle">BID 99.90</text>
      <text x="180" y="118" fill="#4ade80" fontSize="10" fontFamily="monospace" opacity="0.7" textAnchor="middle">12 lots queued</text>
      <rect x="320" y="80" width="200" height="50" rx="6" fill="#7f1d1d" opacity="0.8" />
      <text x="420" y="100" fill="#f87171" fontSize="11" fontFamily="monospace" fontWeight="600" textAnchor="middle">ASK 100.10</text>
      <text x="420" y="118" fill="#f87171" fontSize="10" fontFamily="monospace" opacity="0.7" textAnchor="middle">6 lots queued</text>
      <rect x="280" y="75" width="40" height="60" rx="4" fill="#f59e0b" opacity="0.3" />
      <text x="300" y="109" fill="#f59e0b" fontSize="10" fontFamily="monospace" fontWeight="700" textAnchor="middle">SPREAD</text>
      <text x="300" y="170" fill="#94a3b8" fontSize="11" fontFamily="monospace" textAnchor="middle">Spread = Ask − Bid = 100.10 − 99.90 = $0.20</text>
      <text x="300" y="190" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">Market maker earns $0.20 per round-trip trade</text>
    </svg>
  );
}

function QueueDiagram() {
  return (
    <svg viewBox="0 0 600 260" className="w-full max-w-2xl" fill="none">
      <rect width="600" height="260" rx="12" fill="#111827" />
      <text x="20" y="24" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="600" letterSpacing="0.08em">FIFO QUEUE — PRICE LEVEL 100.00</text>
      <line x1="300" y1="44" x2="300" y2="240" stroke="#1e293b" strokeWidth="1" />
      <text x="20" y="50" fill="#4ade80" fontSize="10" fontFamily="monospace" fontWeight="700">FILLS →</text>
      <text x="310" y="50" fill="#94a3b8" fontSize="10" fontFamily="monospace" fontWeight="700">← ORDERS QUEUED</text>
      {["Order A", "Order B", "Order C", "Order D", "Order E"].map((name, i) => (
        <g key={name}>
          <rect x={20 + i * 12} y={80 + i * 30} width={200 - i * 12} height="24" rx="4" fill="#1e3a5f" opacity={1 - i * 0.15} />
          <text x={28 + i * 12} y={96 + i * 30} fill="#60a5fa" fontSize="11" fontFamily="monospace">{name}</text>
          <text x={130 + i * 12} y={96 + i * 30} fill="#60a5fa" fontSize="10" fontFamily="monospace" opacity="0.6">qty: {10 - i}</text>
          <rect x={300} y={80 + i * 30} width={200 - i * 12} height="24" rx="4" fill="#1e3a5f" opacity={1 - i * 0.15} />
          <text x={492 - i * 12} y={96 + i * 30} fill="#60a5fa" fontSize="11" fontFamily="monospace">{name}</text>
        </g>
      ))}
      <text x="150" y="248" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">First in → First filled (FIFO)</text>
    </svg>
  );
}

function VolatilityDiagram() {
  return (
    <svg viewBox="0 0 600 240" className="w-full max-w-2xl" fill="none">
      <rect width="600" height="240" rx="12" fill="#111827" />
      <text x="20" y="24" fill="#94a3b8" fontSize="11" fontFamily="monospace" fontWeight="600" letterSpacing="0.08em">SPREAD WIDENING ACROSS VOLATILITY REGIMES</text>
      {[
        { label: "Calm", color: "#4ade80", spread: 20, y: 60, w: 100 },
        { label: "Normal", color: "#60a5fa", spread: 30, y: 100, w: 140 },
        { label: "Volatile", color: "#f59e0b", spread: 60, y: 140, w: 200 },
        { label: "Crisis", color: "#f87171", spread: 120, y: 180, w: 380 },
      ].map(({ label, color, spread, y, w }) => (
        <g key={label}>
          <rect x={20} y={y} width={w} height="26" rx="4" fill="#14532d" opacity="0.6" />
          <text x={28} y={y + 17} fill="#4ade80" fontSize="11" fontFamily="monospace">{label}</text>
          <rect x={620 - 20 - w} y={y} width={w} height="26" rx="4" fill="#7f1d1d" opacity="0.6" />
          <text x={600 - 28} y={y + 17} fill="#f87171" fontSize="11" fontFamily="monospace" textAnchor="end">{label}</text>
          <rect x={300 - spread} y={y} width={spread * 2} height="26" rx="0" fill={color} opacity="0.25" />
          <text x="300" y={y + 17} fill={color} fontSize="10" fontFamily="monospace" fontWeight="700" textAnchor="middle">${(spread / 100).toFixed(2)}</text>
        </g>
      ))}
      <text x="300" y="224" fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">Higher volatility → wider spreads → higher transaction costs</text>
    </svg>
  );
}

const DIAGRAMS: Record<ModuleType, ReactNode> = {
  microstructure: <OrderBookDiagram />,
  orderbook: <QueueDiagram />,
  marketmaking: <SpreadDiagram />,
  volatility: <VolatilityDiagram />,
};

export default function ModulePage() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const moduleType = (type as ModuleType) ?? DEFAULT_MODULE;
  const data = MODULE_DATA[moduleType] ?? MODULE_DATA[DEFAULT_MODULE];

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white font-sans">
      <Nav />
      <main className={data.bgGradient}>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 lg:px-12 pt-16 pb-24">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-10 font-mono">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <Link to="/simulations" className="hover:text-white transition-colors">Simulations</Link>
            <span>/</span>
            <span style={{ color: data.accentColor }}>{data.title}</span>
          </div>

          {/* Hero */}
          <div className="mb-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium mb-6 border" style={{ color: data.accentColor, borderColor: `${data.accentColor}40`, backgroundColor: data.accentLight + "18" }}>
              {data.difficulty}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-4 text-white">
              {data.title}
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mb-6 leading-relaxed">
              {data.subtitle}
            </p>
            <div className="flex items-center gap-4 text-sm text-slate-500 font-mono">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {data.time}
              </span>
              <span>•</span>
              <span>{data.goal}</span>
            </div>
          </div>

          {/* Why This Matters */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: data.accentColor }} />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{data.whyThisMatters.heading}</h2>
            </div>
            <div className="grid lg:grid-cols-5 gap-8 items-start">
              <div className="lg:col-span-3 space-y-5">
                {data.whyThisMatters.paragraphs.map((p, i) => (
                  <p key={i} className="text-slate-400 leading-relaxed text-base">{p}</p>
                ))}
              </div>
              <div className="lg:col-span-2">
                <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-4">
                  <div style={{ color: data.accentColor, fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "12px", fontWeight: "600" }}>MODULE PREVIEW</div>
                  <div className="rounded-lg overflow-hidden">{DIAGRAMS[moduleType]}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Key Concepts */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: data.accentColor }} />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Key Concepts</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              {data.keyConcepts.map((concept) => (
                <div key={concept.title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/8 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: data.accentLight + "30", color: data.accentColor }}>
                      {concept.icon}
                    </div>
                    <h3 className="font-semibold text-white text-base">{concept.title}</h3>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{concept.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Visual Diagram */}
          <section className="mb-20">
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 p-6 sm:p-8">
              <div style={{ color: data.accentColor, fontFamily: "monospace", fontSize: "11px", letterSpacing: "0.1em", marginBottom: "20px", fontWeight: "600" }}>VISUAL ILLUSTRATION</div>
              <div className="flex justify-center">{DIAGRAMS[moduleType]}</div>
            </div>
          </section>

          {/* Learning Outcomes */}
          <section className="mb-20">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1 h-6 rounded-full" style={{ backgroundColor: data.accentColor }} />
              <h2 className="text-2xl sm:text-3xl font-bold text-white">Learning Outcomes</h2>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
              <p className="text-slate-400 text-sm mb-6">After completing this module, you will understand:</p>
              <ul className="space-y-4">
                {data.learningOutcomes.map((outcome, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <div className="w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ borderColor: data.accentColor }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.accentColor }} />
                    </div>
                    <span className="leading-relaxed">{outcome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* CTA */}
          <section className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Ready to explore?</h3>
              <p className="text-slate-400 text-sm">Launch the simulation and observe these concepts in action.</p>
            </div>
            <Link
              to={data.simRoute}
              className="flex items-center gap-3 px-6 py-3.5 rounded-full text-white text-sm font-semibold transition-all hover:scale-105 flex-shrink-0"
              style={{ backgroundColor: data.accentColor }}
            >
              <TextRollButton>Enter Simulation</TextRollButton>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight size={14} strokeWidth={2.5} />
              </div>
            </Link>
          </section>

          {/* Back nav */}
          <div className="mt-12 flex items-center gap-6">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors font-mono">
              <ArrowLeft size={14} />
              Back
            </button>
            <Link to="/simulations" className="text-sm text-slate-500 hover:text-white transition-colors font-mono">
              All Simulations
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}
