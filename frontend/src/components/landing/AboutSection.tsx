import { ArrowRight } from "lucide-react";

const SMALL_IMG =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260516_090123_74be96d4-9c1b-40cf-932a-96f4f4babed3.png&w=1280&q=85";
const LARGE_IMG =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260516_090133_c157d30b-a99a-4477-bec1-a446149ec3f2.png&w=1280&q=85";

function TextRollLink({ children }: { children: string }) {
  return (
    <div className="relative overflow-hidden h-5">
      <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2 text-[#F26522]">
        <span>{children}</span>
        <span>{children}</span>
      </span>
    </div>
  );
}

export default function AboutSection() {
  return (
    <section className="bg-white pt-16 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-24 overflow-hidden">
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
          className="px-5 sm:px-8 lg:px-12 font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 mb-12 sm:mb-16 lg:mb-28"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 3.2rem)",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          Understand how markets work — <br className="hidden sm:block" />
          <span className="hidden sm:block" />
          through simulation, not speculation.
        </h2>

        {/* Content — responsive layout */}
        <div className="lg:hidden px-5 sm:px-8">
          {/* Mobile/tablet: stacked */}
          <div className="flex flex-col gap-8 sm:gap-10">
            <div>
              <p className="text-[15px] sm:text-[17px] leading-[1.6] font-medium text-gray-900 mb-6">
                Financial markets are not magic — they are protocols. Market microstructure
                is the study of how those protocols work: how orders arrive at an exchange,
                how they are matched, and how prices emerge from the continuous interaction
                of buyers and sellers.
              </p>
              <button className="group flex items-center gap-2 text-[#F26522] text-[14px] font-medium">
                <TextRollLink>Learn about market microstructure</TextRollLink>
                <ArrowRight
                  size={14}
                  strokeWidth={2.5}
                  className="text-[#F26522] group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex-shrink-0"
                />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <img
                src={SMALL_IMG}
                alt="Market microstructure simulation"
                className="w-full rounded-xl sm:rounded-2xl object-cover aspect-[438/346]"
              />
              <img
                src={LARGE_IMG}
                alt="Order book visualization"
                className="w-full rounded-xl sm:rounded-2xl object-cover aspect-[900/600]"
              />
            </div>
          </div>
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden lg:grid grid-cols-[26%_1fr_48%] items-end gap-6 xl:gap-8 px-12 xl:px-12">
          {/* Left: small image */}
          <div className="self-end">
            <img
              src={SMALL_IMG}
              alt="Market microstructure simulation"
              className="w-full rounded-2xl object-cover aspect-[438/346]"
            />
          </div>

          {/* Center: text */}
          <div className="self-start flex flex-col items-end gap-8">
            <p
              className="text-[16px] xl:text-[18px] leading-[1.65] text-gray-900 whitespace-nowrap font-medium"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Financial markets are not magic —<br />
              they are protocols.
            </p>
            <button className="group flex items-center gap-2 text-[#F26522] text-[14px] font-medium">
              <TextRollLink>Learn about market microstructure</TextRollLink>
              <ArrowRight
                size={14}
                strokeWidth={2.5}
                className="text-[#F26522] group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
              />
            </button>
          </div>

          {/* Right: large image */}
          <div className="self-end">
            <img
              src={LARGE_IMG}
              alt="Order book visualization"
              className="w-full rounded-2xl object-cover aspect-[3/2]"
            />
          </div>
        </div>

        {/* Educational content block */}
        <div className="mt-16 sm:mt-20 lg:mt-28 px-5 sm:px-8 lg:px-12 max-w-4xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">
                What is microstructure?
              </h3>
              <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed">
                The study of how orders become trades, and trades become prices.
                Every bid, every ask, every fill tells a story about information,
                incentives, and competition.
              </p>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">
                Inspired by Jane Street
              </h3>
              <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed">
                At Jane Street, rigorous understanding of microstructure is foundational.
                Every market maker must reason precisely about who is on the other side
                of each trade. This simulator distills those ideas into something you can see.
              </p>
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 mb-3">
                Five agents, one book
              </h3>
              <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed">
                A market maker, two random traders, a momentum agent, and a mean reversion
                agent — all competing in a single limit order book. You control the
                environment. Watch the market think.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
