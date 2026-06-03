import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import LondonClock from "./LondonClock";
import TextRollButton from "./TextRollButton";

const NAV_LINKS = [
  { label: "Simulations", href: "/simulations" },
  { label: "About", href: "#about" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Agents", href: "#agents" },
  { label: "Contact", href: "#contact" },
];

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-20 px-2 sm:p-3">
        <div className="max-w-[1440px] mx-auto bg-white rounded-full px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm flex items-center justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold tracking-tight text-[10px] sm:text-[11px]">MM</span>
            </div>
            <span className="hidden md:block text-gray-900 text-sm hover:text-gray-500 transition-colors duration-300 cursor-pointer">
              Mini Market
            </span>
          </div>

          {/* Center nav links (desktop) */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="text-gray-900 text-sm hover:text-gray-500 transition-colors duration-300 cursor-pointer bg-transparent border-none p-0"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-gray-600">
              <span className="text-[13px] hidden xl:block">
                London time
              </span>
              <LondonClock />
            </div>
            <Link
              to="/simulate/microstructure"
              className="hidden md:flex items-center gap-2 bg-gray-900 text-white text-[13px] font-medium rounded-full pl-4 sm:pl-5 pr-2 py-1.5 sm:py-2 group"
            >
              <TextRollButton>Launch Simulator</TextRollButton>
              <div className="w-6 h-6 rounded-full bg-white/10 group-hover:rotate-[-45deg] transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] flex items-center justify-center flex-shrink-0">
                <ArrowRight size={12} strokeWidth={2.5} className="text-white" />
              </div>
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0"
              aria-label="Toggle menu"
            >
              {menuOpen ? (
                <X size={16} strokeWidth={2} className="text-white" />
              ) : (
                <Menu size={16} strokeWidth={2} className="text-white" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-3 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-6 translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-400">
                <LondonClock />
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <X size={20} strokeWidth={2} className="text-gray-900" />
              </button>
            </div>
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className="text-gray-900 text-[28px] font-medium py-2 cursor-pointer bg-transparent border-none text-left p-0"
                >
                  {link.label}
                </button>
              ))}
            </div>
            <Link
              to="/simulate/microstructure"
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between bg-[#F26522] text-white text-[15px] font-semibold rounded-full px-5 py-3 w-full"
            >
              <TextRollButton>Launch Simulator</TextRollButton>
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
