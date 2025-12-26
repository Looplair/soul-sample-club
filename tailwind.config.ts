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
        // Core Background Colors - Sleek Dark
        black: "#000000",
        charcoal: "#1A1A1A",
        "charcoal-light": "#1E1E1E",
        "charcoal-elevated": "#222222",

        // Grey Scale - Neutral Depth
        "grey-900": "#1A1A1A",
        "grey-800": "#2A2A2A",
        "grey-700": "#3A3A3A",
        "grey-600": "#4A4A4A",
        "grey-500": "#5A5A5A",
        "grey-400": "#6A6A6A",
        "grey-300": "#8A8A8A",
        "grey-200": "#AAAAAA",
        "grey-100": "#CCCCCC",

        // Text Hierarchy
        "text-primary": "#FFFFFF",
        "text-secondary": "#E5E5E5",
        "text-muted": "#999999",
        "text-subtle": "#666666",

        // Accent - Clean White
        accent: {
          DEFAULT: "#FFFFFF",
          muted: "rgba(255, 255, 255, 0.1)",
          hover: "rgba(255, 255, 255, 0.15)",
        },

        // Border color
        border: "#3A3A3A",

        // Waveform Colors - Monochrome
        waveform: {
          unplayed: "#3A3A3A",
          played: "#FFFFFF",
          cursor: "#FFFFFF",
        },

        // Functional Colors
        success: "#22C55E",
        warning: "#EAB308",
        error: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        wordmark: ["var(--font-wordmark)", "sans-serif"],
      },
      fontSize: {
        // Display & Headings
        "display": ["56px", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.025em" }],
        "h1": ["40px", { lineHeight: "1.1", fontWeight: "600", letterSpacing: "-0.02em" }],
        "h2": ["28px", { lineHeight: "1.2", fontWeight: "600", letterSpacing: "-0.015em" }],
        "h3": ["20px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "-0.01em" }],
        "h4": ["16px", { lineHeight: "1.4", fontWeight: "600" }],

        // Body Text
        "body-lg": ["17px", { lineHeight: "1.6", fontWeight: "400" }],
        "body": ["15px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],

        // Labels & Captions
        "label": ["13px", { lineHeight: "1.4", fontWeight: "500" }],
        "caption": ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        "overline": ["11px", { lineHeight: "1.3", fontWeight: "600", letterSpacing: "0.05em" }],
      },
      spacing: {
        "px": "1px",
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "11": "44px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "18": "72px",
        "20": "80px",
        "24": "96px",
      },
      borderRadius: {
        "none": "0",
        "sm": "6px",
        "DEFAULT": "8px",
        "md": "10px",
        "lg": "12px",
        "xl": "16px",
        "2xl": "20px",
        "3xl": "24px",
        "full": "9999px",
        // Specific use cases - Tracklib style pills
        "button": "9999px",
        "pill": "9999px",
        "card": "16px",
        "modal": "20px",
        "image": "12px",
        "input": "9999px",
        "filter": "9999px",
      },
      boxShadow: {
        // Soft shadows for depth - very subtle
        "sm": "0 1px 2px rgba(0, 0, 0, 0.2)",
        "DEFAULT": "0 2px 6px rgba(0, 0, 0, 0.15)",
        "md": "0 4px 12px rgba(0, 0, 0, 0.15)",
        "lg": "0 8px 24px rgba(0, 0, 0, 0.2)",
        "xl": "0 16px 40px rgba(0, 0, 0, 0.25)",

        // Card shadows - subtle
        "card": "0 2px 12px rgba(0, 0, 0, 0.15)",
        "card-hover": "0 8px 30px rgba(0, 0, 0, 0.25)",

        // White glow effects for hover
        "glow-white": "0 0 20px rgba(255, 255, 255, 0.15)",
        "glow-white-soft": "0 0 30px rgba(255, 255, 255, 0.1)",
        "glow-white-intense": "0 0 40px rgba(255, 255, 255, 0.2)",

        // Button shadows
        "button": "0 2px 8px rgba(0, 0, 0, 0.15)",
        "button-hover": "0 4px 16px rgba(0, 0, 0, 0.2)",
        "button-pressed": "inset 0 2px 4px rgba(0, 0, 0, 0.2)",

        // Ring for focus states
        "ring-white": "0 0 0 2px rgba(255, 255, 255, 0.3)",
        "ring-white-glow": "0 0 0 2px rgba(255, 255, 255, 0.3), 0 0 15px rgba(255, 255, 255, 0.1)",
      },
      animation: {
        // Fade animations
        "fade-in": "fadeIn 0.3s ease-out",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "fade-in-down": "fadeInDown 0.4s ease-out",

        // Scale animations
        "scale-in": "scaleIn 0.2s ease-out",
        "scale-out": "scaleOut 0.2s ease-in",

        // Slide animations
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-down": "slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-left": "slideLeft 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        "slide-right": "slideRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)",

        // Glow animations - white
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "glow-soft": "glowSoft 3s ease-in-out infinite",

        // Loading animations
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",

        // Hover/Active states
        "press": "press 0.15s ease-out",
        "hover-scale": "hoverScale 0.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeInDown: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        scaleOut: {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.95)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideLeft: {
          "0%": { opacity: "0", transform: "translateX(24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideRight: {
          "0%": { opacity: "0", transform: "translateX(-24px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(255, 255, 255, 0.1)" },
          "50%": { boxShadow: "0 0 25px rgba(255, 255, 255, 0.2)" },
        },
        glowSoft: {
          "0%, 100%": { boxShadow: "0 0 10px rgba(255, 255, 255, 0.05)" },
          "50%": { boxShadow: "0 0 20px rgba(255, 255, 255, 0.1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        press: {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
        hoverScale: {
          "0%": { transform: "scale(1)" },
          "100%": { transform: "scale(1.02)" },
        },
      },
      backgroundImage: {
        // Shimmer gradient for skeletons
        "shimmer": "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.03), transparent)",
        // Subtle gradient overlays
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-card": "linear-gradient(180deg, rgba(26, 26, 26, 0) 0%, rgba(26, 26, 26, 0.9) 100%)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
      },
      transitionDuration: {
        "0": "0ms",
        "150": "150ms",
        "200": "200ms",
        "250": "250ms",
        "300": "300ms",
        "400": "400ms",
        "500": "500ms",
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
    },
  },
  plugins: [],
};

export default config;
