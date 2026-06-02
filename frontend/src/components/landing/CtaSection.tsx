import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

const LEARNING_OUTCOMES = [
  "How an order book is structured and how bids/asks interact",
  "What a spread is and why market makers earn it",
  "The difference between informed and uninformed trading",
  "Why momentum and mean reversion strategies are natural opposites",
  "How a market maker manages inventory and adverse selection risk",
  "The role of randomness in price formation",
];

export default function CtaSection() {
  return (
    <section className="bg-[#0a0e17] pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-20 lg:pb-28">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Badge */}
        <div className="flex items-center gap-3 mb-8 sm:mb-10">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#F26522] flex items-center justify-center flex-shrink-0">
            <Play size={10} fill="white" strokeWidth={0} />
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-white/20 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-white/60">
            Ready to start
          </span>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-start">
          {/* Left: heading + CTA */}
          <div>
            <h2
              className="font-medium leading-[1.08] tracking-[-0.03em] text-white mb-6 sm:mb-8"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.8rem)",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Start exploring
              <br />
              <span className="text-[#F26522]">market microstructure.</span>
            </h2>
            <p className="text-[15px] sm:text-[16px] text-white/60 leading-relaxed mb-8 sm:mb-10 max-w-lg">
              Configure volatility, seed, and number of ticks. Watch the order book
              come alive as five agents compete in real time.
            </p>
            <Link
              to="/simulate"
              className="inline-flex items-center gap-3 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] sm:text-[15px] font-semibold rounded-full pl-6 sm:pl-7 pr-3 py-3 sm:py-3.5 group"
            >
              <span>Launch Simulator</span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center justify-center">
                <ArrowRight size={16} strokeWidth={2.5} className="text-white" />
              </div>
            </Link>
          </div>

          {/* Right: learning outcomes */}
          <div>
            <h3 className="text-[13px] sm:text-[14px] font-semibold text-white/40 uppercase tracking-widest mb-5 sm:mb-6">
              What you'll learn
            </h3>
            <ul className="flex flex-col gap-3 sm:gap-4">
              {LEARNING_OUTCOMES.map((outcome, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#F26522]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F26522]" />
                  </div>
                  <span className="text-[14px] sm:text-[15px] text-white/70 leading-relaxed">
                    {outcome}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10 mt-16 sm:mt-20 pt-8 sm:pt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-[10px] tracking-tight">MM</span>
            </div>
            <span className="text-[13px] sm:text-[14px] text-white/40">
              Mini Market Simulator — Built for education
            </span>
          </div>
          <div className="text-[12px] sm:text-[13px] text-white/30">
            Market data is simulated. For educational purposes only.
          </div>
        </div>
      </div>
    </section>
  );
}
