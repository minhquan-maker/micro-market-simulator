import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

function TextRollButton({ children }: { children: string }) {
  return (
    <div className="relative overflow-hidden h-5">
      <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
        <span>{children}</span>
        <span>{children}</span>
      </span>
    </div>
  );
}

function PartnerBadge() {
  return (
    <div className="group inline-flex items-center gap-2 bg-white rounded-[4px] px-3 sm:px-4 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-shadow duration-300 cursor-pointer">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className="w-5 h-5 sm:w-6 sm:h-6 fill-current text-[#E8704E] flex-shrink-0"
      >
        <path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" />
      </svg>
      <span className="text-[13px] sm:text-[14px] font-medium text-gray-900 whitespace-nowrap">
        Educational Platform
      </span>
      <span className="hidden sm:inline-flex text-[10px] sm:text-[11px] bg-gray-900 text-white px-1.5 sm:px-2 py-0.5 rounded font-medium">
        Featured
      </span>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col bg-[#EFEFEF] overflow-hidden">
      {/* CSS Animated Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#EFEFEF] via-[#f5f5f5] to-[#e8e8e8]" />
        {/* Animated orb 1 */}
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#F26522]/20 to-[#ff8c42]/10 blur-[120px] animate-[float_8s_ease-in-out_infinite]" />
        {/* Animated orb 2 */}
        <div className="absolute top-1/3 -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-[#F26522]/15 to-[#e05a1a]/5 blur-[100px] animate-[float_10s_ease-in-out_infinite_reverse]" />
        {/* Animated orb 3 */}
        <div className="absolute bottom-20 right-20 w-[400px] h-[400px] rounded-full bg-gradient-to-tl from-[#ff5f03]/10 to-transparent blur-[80px] animate-[float_12s_ease-in-out_infinite]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-end max-w-[1440px] mx-auto w-full px-5 sm:px-8 lg:px-12 pb-14 sm:pb-16 lg:pb-20">
        <div className="max-w-4xl">
          {/* Label */}
          <p className="text-[13px] sm:text-[14px] text-gray-900 tracking-wide mb-5 sm:mb-8 font-medium">
            Mini Market Simulator
          </p>

          {/* Headline */}
          <h1 className="font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-8 sm:mb-12">
            <span
              className="block text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              See the market
            </span>
            <span
              className="block text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              think in real time.
            </span>
            <span
              className="block text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] text-[#F26522]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              No account. No data. No friction.
            </span>
          </h1>

          {/* Sub-headline */}
          <p className="text-[15px] sm:text-[16px] text-gray-600 leading-relaxed mb-8 sm:mb-10 max-w-2xl">
            A real-time market microstructure simulator. Watch five trading agents interact
            in a live order book — observe price formation, spread dynamics, and
            trading strategy as it happens.
          </p>

          {/* CTA row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            <Link
              to="/simulate"
              className="flex items-center gap-2 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 group"
            >
              <TextRollButton>Start Simulating</TextRollButton>
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center justify-center flex-shrink-0">
                <ArrowRight size={14} strokeWidth={2.5} className="text-white" />
              </div>
            </Link>
            <PartnerBadge />
          </div>
        </div>
      </div>
    </section>
  );
}
