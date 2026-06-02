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
            <span className="text-white text-[11px] sm:text-[12px] font-semibold">3</span>
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
              className="font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-6 sm:mb-8"
              style={{
                fontSize: "clamp(1.75rem, 5vw, 3.2rem)",
                fontFamily: "Inter, system-ui, sans-serif",
              }}
            >
              Built to understand
              <br />
              <span className="text-[#F26522]">how markets really work.</span>
            </h2>
            <div className="flex flex-col gap-5 text-[15px] sm:text-[16px] text-gray-600 leading-relaxed">
              <p>
                This simulator was created to bridge the gap between abstract financial theory
                and the concrete mechanics of price formation. It is inspired by the rigorous
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
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-7 sm:p-8 shadow-sm border border-gray-200">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl tracking-tight">NMQ</span>
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-gray-900 mb-1">
                    Nguyen Minh Quan
                  </h3>
                  <p className="text-[13px] sm:text-[14px] text-gray-500">
                    Founder & Developer
                  </p>
                </div>
              </div>

              <p className="text-[14px] sm:text-[15px] text-gray-600 leading-relaxed mb-6">
                Quantitative finance enthusiast with a background in software engineering.
                Building tools that make complex market mechanics accessible and interactive.
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href="https://www.linkedin.com/in/ngminnhquan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[14px] font-medium text-gray-700 hover:text-[#0A66C2] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#0A66C2]/10 flex items-center justify-center group-hover:bg-[#0A66C2]/20 transition-colors">
                    <Linkedin size={16} strokeWidth={1.8} className="text-[#0A66C2]" />
                  </div>
                  <span>Connect on LinkedIn</span>
                  <ExternalLink size={12} strokeWidth={2} className="text-gray-400 ml-auto" />
                </a>
                <a
                  href="https://github.com/ngminnhquan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[14px] font-medium text-gray-700 hover:text-gray-900 transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Github size={16} strokeWidth={1.8} />
                  </div>
                  <span>GitHub Profile</span>
                  <ExternalLink size={12} strokeWidth={2} className="text-gray-400 ml-auto" />
                </a>
                <a
                  href="mailto:ngminnhquan@gmail.com"
                  className="flex items-center gap-3 text-[14px] font-medium text-gray-700 hover:text-[#F26522] transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F26522]/10 flex items-center justify-center group-hover:bg-[#F26522]/20 transition-colors">
                    <Mail size={16} strokeWidth={1.8} className="text-[#F26522]" />
                  </div>
                  <span>ngminnhquan@gmail.com</span>
                  <ExternalLink size={12} strokeWidth={2} className="text-gray-400 ml-auto" />
                </a>
              </div>
            </div>

            {/* CTA card */}
            <div className="bg-gray-900 rounded-2xl p-7 sm:p-8">
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-white mb-3">
                Interested in the code?
              </h3>
              <p className="text-[13px] sm:text-[14px] text-white/50 leading-relaxed mb-5">
                The full source is open. Explore the simulation engine, the matching logic,
                and the agent strategies on GitHub.
              </p>
              <a
                href="https://github.com/ngminnhquan/market-microstructure-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-gray-900 text-[13px] sm:text-[14px] font-semibold rounded-full px-5 py-2.5 hover:bg-gray-100 transition-colors"
              >
                View on GitHub
                <ArrowRight size={14} strokeWidth={2.5} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
