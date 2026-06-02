import { Link } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";

const OUTCOMES = [
  "How an order book is structured and how bids/asks interact",
  "Why spreads exist and what determines their width",
  "How market makers earn the spread while managing inventory",
  "Why momentum and mean reversion strategies exist",
  "What price discovery means and why markets move",
];

export default function CtaSection() {
  return (
    <section className="bg-gray-900 pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20 lg:pb-24">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-center">
          {/* Left */}
          <div className="flex flex-col gap-6 sm:gap-8">
            <h2
              className="font-medium leading-[1.1] tracking-[-0.025em] text-white"
              style={{
                fontSize: "clamp(1.75rem, 5vw, 3rem)",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Ready to see the market
              <br />
              <span className="text-[#F26522]">think for itself?</span>
            </h2>

            <div className="flex flex-col gap-2">
              <p className="text-[14px] sm:text-[15px] text-white/50 font-medium uppercase tracking-wider">
                What you&apos;ll learn
              </p>
              <ul className="flex flex-col gap-2.5">
                {OUTCOMES.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-[14px] sm:text-[15px] text-white/70"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F26522] mt-2 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right */}
          <div className="flex flex-col items-start gap-6 sm:gap-8">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-7 sm:p-8 w-full">
              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#F26522]/20 rounded-xl flex items-center justify-center">
                    <Play size={18} strokeWidth={2} className="text-[#F26522]" />
                  </div>
                  <div>
                    <p className="text-[14px] sm:text-[15px] font-semibold text-white">
                      No sign-up required
                    </p>
                    <p className="text-[12px] sm:text-[13px] text-white/40">
                      Runs entirely in your browser
                    </p>
                  </div>
                </div>

                <p className="text-[13px] sm:text-[14px] text-white/50 leading-relaxed">
                  Start a simulation with 5 autonomous agents competing in a live order book.
                  Adjust volatility, pick your difficulty, and watch the market emerge.
                </p>
              </div>
            </div>

            <Link
              to="/simulate"
              className="flex items-center gap-3 bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] sm:text-[15px] font-medium rounded-full pl-6 sm:pl-7 pr-3 py-3 sm:py-3.5 group transition-colors"
            >
              <span className="relative overflow-hidden h-5">
                <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                  <span>Start Simulating</span>
                  <span>Start Simulating</span>
                </span>
              </span>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/20 group-hover:rotate-[-45deg] transition-transform duration-500 flex items-center justify-center">
                <ArrowRight size={15} strokeWidth={2.5} className="text-white" />
              </div>
            </Link>

            <p className="text-[12px] sm:text-[13px] text-white/30">
              Market data is simulated. For educational purposes only.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
