/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // ── Brand colours ──────────────────────────────────────────────────────
      colors: {
        primary:       "#4F46E5", // indigo-600
        "primary-hover": "#4338CA",

        surface:       "#F8FAFC", // slate-50 — page background

        "success-light": "#ECFDF5", // emerald-50
        "warning-light": "#FFFBEB", // amber-50
        "danger-light":  "#FEF2F2", // red-50
      },

      // ── Typography ─────────────────────────────────────────────────────────
      fontFamily: {
        display: ["Playfair Display", "Georgia", "serif"],
        body:    ["DM Sans",          "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono",   "Menlo",     "monospace"],
      },

      // ── Shadows ────────────────────────────────────────────────────────────
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / .06), 0 1px 2px -1px rgb(0 0 0 / .04)",
      },

      // ── Border-radius ──────────────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};