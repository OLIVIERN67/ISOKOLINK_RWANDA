/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: "#176B45",
          50: "#EAF5EF",
          100: "#CDE9DA",
          200: "#9ED2B9",
          300: "#67B694",
          400: "#3D9A73",
          500: "#2E8B57",
          600: "#176B45",
          700: "#125537",
          800: "#0E4029",
          900: "#092B1C",
        },
        cream: "#FAF8F0",
        harvest: {
          DEFAULT: "#E8B44F",
          light: "#F6E2AF",
          dark: "#C08F2E",
        },
        charcoal: "#24312B",
        lightgray: "#F3F5F4",
        error: "#C62828",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(36,49,43,0.06), 0 8px 24px rgba(36,49,43,0.06)",
        lift: "0 12px 32px rgba(36,49,43,0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};
