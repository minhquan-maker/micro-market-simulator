import { ArrowRight, Linkedin, Github, Mail, ExternalLink } from "lucide-react";

export default function ContactSection() {
  return (
    <section
      id="contact"
      className="bg-[#EFEFEF] pt-20 sm:pt-28 lg:pt-36 pb-16 sm:pb-20 lg:pb-28"
    >
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
        {/* Badge */}
        <div className="flex items-center gap-3 mb-6 sm:mb-8">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[11px] sm:text-[12px] font-semibold">5</span>
          </div>
          <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-600">
            About the Creator
          </span>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 sm:gap-16 lg:gap-20 items-start">
          {/* Left: story */}
          <div>
            <h2
              className="font-medium leading-[1.1] tracking-[-0.025em] text-gray-900 mb-6 sm:mb-8"
              style={{
                fontSize: "clamp(1.5rem, 4vw, 3rem)",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Built to understand
              <br />
              <span className="text-[#F26522]">how markets really work.</span>
            </h2>
            <div className="flex flex-col gap-4 text-[14px] sm:text-[15px] text-gray-600 leading-relaxed">
              <p>
                This simulator was created to bridge the gap between abstract financial theory
                and the concrete mechanics of price formation. Inspired by the rigorous
                approach of firms like Jane Street and Optiver, where understanding
                microstructure is not optional — it is the job.
              </p>
              <p>
                Whether you are preparing for a quantitative trading interview, writing a
                research paper, or simply curious about how HFT and market making actually
                work under the hood — this tool lets you see it, not just read about it.
              </p>
              <p>
                The simulation uses real order book mechanics, FIFO matching, and competing
                trading strategies to produce emergent market behavior. Every spread you see
                is earned, every trade has a counterparty, and every price reflects the
                collective decisions of autonomous agents.
              </p>
            </div>
          </div>

          {/* Right: creator card */}
          <div className="flex flex-col gap-5">
            <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 bg-gray-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg tracking-tight">NMQ</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-semibold text-gray-900 mb-1">
                    Nguyen Minh Quan
                  </h3>
                  <p className="text-[13px] text-gray-500">
                    Founder & Developer
                  </p>
                </div>
              </div>

              <p className="text-[13px] sm:text-[14px] text-gray-600 leading-relaxed mb-5">
                Quantitative finance enthusiast with a background in software engineering.
                Building tools that make complex market mechanics accessible and interactive.
              </p>

              <div className="flex flex-col gap-2.5">
                <a
                  href="https://www.linkedin.com/in/ngminnhquan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[13px] sm:text-[14px] font-medium text-gray-700 hover:text-[#0A66C2] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center group-hover:bg-[#0A66C2]/20 transition-colors">
                    <Linkedin size={15} strokeWidth={1.8} className="text-[#0A66C2]" />
                  </div>
                  <span>Connect on LinkedIn</span>
                  <ExternalLink size={11} strokeWidth={2} className="text-gray-400 ml-auto" />
                </a>
                <a
                  href="https://github.com/nguyenminhquan-maker"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[13px] sm:text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Github size={15} strokeWidth={1.8} />
                  </div>
                  <span>GitHub Profile</span>
                  <ExternalLink size={11} strokeWidth={2} className="text-gray-400 ml-auto" />
                </a>
                <a
                  href="mailto:ngminnhquan@gmail.com"
                  className="flex items-center gap-3 text-[13px] sm:text-[14px] font-medium text-gray-700 hover:text-[#F26522] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F26522]/10 flex items-center justify-center group-hover:bg-[#F26522]/20 transition-colors">
                    <Mail size={15} strokeWidth={1.8} className="text-[#F26522]" />
                  </div>
                  <span>ngminnhquan@gmail.com</span>
                  <ExternalLink size={11} strokeWidth={2} className="text-gray-400 ml-auto" />
                </a>
              </div>
            </div>

            {/* Open source card */}
            <div className="bg-gray-900 rounded-2xl p-6 sm:p-7">
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-white mb-2.5">
                Open Source
              </h3>
              <p className="text-[12px] sm:text-[13px] text-white/45 leading-relaxed mb-4">
                The full source is open. Explore the simulation engine, matching logic, and agent strategies.
              </p>
              <a
                href="https://github.com/nguyenminhquan-maker/micro-market-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-gray-900 text-[12px] sm:text-[13px] font-semibold rounded-full px-4 py-2 hover:bg-gray-100 transition-colors"
              >
                View Repository
                <ArrowRight size={13} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
