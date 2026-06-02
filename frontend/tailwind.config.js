/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          dark: "#0a0e17",
          light: "#ffffff",
        },
        brand: {
          DEFAULT: "#F26522",
          hover: "#e05a1a",
          light: "#ff7a3d",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "text-roll": "textRoll 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards",
      },
      keyframes: {
        textRoll: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
      },
    },
  },
  plugins: [],
};
