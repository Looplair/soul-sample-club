import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        midnight: "#0D0D0F",
        "midnight-light": "#0F0F12",
        velvet: "#6D4AFF",

        // Secondary Colors
        graphite: "#1A1B1E",
        steel: "#2A2C31",
        "steel-light": "#34363D",

        // Accent Colors
        mint: "#4AE3B5",
        peach: "#FFBFA4",
        "velvet-light": "#7C5CFF",
        snow: "#F5F5F7",

        // Functional Colors
        error: "#FF5C5C",
        warning: "#F2C94C",
        success: "#27AE60",

        // Category Accents
        "soul-gold": "#D7B77A",
        "sakura-rose": "#FF8EA8",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "h1": ["48px", { lineHeight: "1.1", fontWeight: "700", letterSpacing: "-0.01em" }],
        "h2": ["32px", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.01em" }],
        "h3": ["24px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.01em" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "label": ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "400" }],
      },
      spacing: {
        "4": "4px",
        "8": "8px",
        "12": "12px",
        "16": "16px",
        "20": "20px",
        "24": "24px",
        "32": "32px",
        "40": "40px",
        "48": "48px",
        "64": "64px",
        "72": "72px",
      },
      borderRadius: {
        "button": "8px",
        "card": "12px",
        "player": "12px",
        "image": "10px",
      },
      boxShadow: {
        "card": "0 4px 24px rgba(0, 0, 0, 0.25)",
        "card-hover": "0 6px 32px rgba(0, 0, 0, 0.32)",
        "glow": "0 0 12px rgba(109, 74, 255, 0.45)",
        "glow-mint": "0 0 12px rgba(74, 227, 181, 0.35)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 12px rgba(109, 74, 255, 0.45)" },
          "50%": { boxShadow: "0 0 20px rgba(109, 74, 255, 0.65)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
