import Nav from "../components/landing/Nav";
import HeroSection from "../components/landing/HeroSection";
import AboutSection from "../components/landing/AboutSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import AgentsSection from "../components/landing/AgentsSection";
import SimulatorSelector from "../components/landing/SimulatorSelector";
import CtaSection from "../components/landing/CtaSection";
import ContactSection from "../components/landing/ContactSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#EFEFEF]">
      <Nav />
      <HeroSection />
      <SimulatorSelector />
      <AboutSection />
      <HowItWorksSection />
      <AgentsSection />
      <CtaSection />
      <ContactSection />
      <footer className="bg-[#0a0e17] py-5 sm:py-6 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-[8px] tracking-tight">MM</span>
            </div>
            <span className="text-[11px] sm:text-[12px] text-white/30">Market Lab</span>
          </div>
          <p className="text-[11px] sm:text-[12px] text-white/20">
            Market data is simulated. For educational purposes only.
          </p>
        </div>
      </footer>
    </div>
  );
}
