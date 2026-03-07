/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: "#4F46E5", hover: "#4338CA", light: "#EEF2FF" },
        success:  { DEFAULT: "#10B981", light: "#D1FAE5" },
        warning:  { DEFAULT: "#F59E0B", light: "#FEF3C7" },
        danger:   { DEFAULT: "#EF4444", light: "#FEE2E2" },
        surface:  { DEFAULT: "#F8FAFC", dark: "#0F172A" },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      boxShadow: {
        card:  "0 1px 3px rgba(0,0,0,.06), 0 4px 16px rgba(0,0,0,.04)",
        hover: "0 4px 24px rgba(79,70,229,.12)",
      },
    },
  },
  plugins: [],
};