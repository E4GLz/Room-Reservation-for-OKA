import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d8ecff",
          200: "#b9dfff",
          300: "#88caff",
          400: "#4ea9ff",
          500: "#1c86f2",
          600: "#0e69cf",
          700: "#0e54a7",
          800: "#124986",
          900: "#163e6f"
        },
        ink: {
          950: "#0f1720"
        },
        sand: "#f6f3ea"
      },
      boxShadow: {
        card: "0 20px 45px -20px rgba(12, 36, 64, 0.25)"
      },
      fontFamily: {
        sans: ["var(--font-sans)"]
      },
      backgroundImage: {
        "hero-grid":
          "linear-gradient(rgba(255,255,255,0.65) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.65) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;
