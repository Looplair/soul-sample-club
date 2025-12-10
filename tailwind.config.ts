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
        // Core Background Colors - Cinematic Dark
        black: "#000000",
        "black-light": "#0A0A0B",
        "black-elevated": "#111113",
        "black-card": "#141416",

        // Grey Scale - Subtle Depth
        "grey-900": "#18181B",
        "grey-800": "#1C1C1F",
        "grey-700": "#232326",
        "grey-600": "#2A2A2E",
        "grey-500": "#3F3F46",
        "grey-400": "#52525B",
        "grey-300": "#71717A",
        "grey-200": "#A1A1AA",
        "grey-100": "#D4D4D8",

        // Text Hierarchy
        "text-primary": "#FFFFFF",
        "text-secondary": "#E4E4E7",
        "text-muted": "#A1A1AA",
        "text-subtle": "#71717A",

        // Accent - Premium Purple
        purple: {
          DEFAULT: "#8B5CF6",
          light: "#A78BFA",
          dark: "#7C3AED",
          glow: "rgba(139, 92, 246, 0.5)",
          muted: "rgba(139, 92, 246, 0.15)",
        },

        // Waveform Colors
        waveform: {
          unplayed: "#3F3F46",
          played: "#8B5CF6",
          cursor: "#A78BFA",
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
        // Specific use cases
        "button": "12px",
        "card": "20px",
        "modal": "24px",
        "image": "16px",
        "input": "10px",
      },
      boxShadow: {
        // Soft shadows for depth
        "sm": "0 1px 2px rgba(0, 0, 0, 0.4)",
        "DEFAULT": "0 2px 8px rgba(0, 0, 0, 0.4)",
        "md": "0 4px 16px rgba(0, 0, 0, 0.4)",
        "lg": "0 8px 32px rgba(0, 0, 0, 0.5)",
        "xl": "0 16px 48px rgba(0, 0, 0, 0.6)",

        // Card shadows
        "card": "0 4px 24px rgba(0, 0, 0, 0.35)",
        "card-hover": "0 8px 40px rgba(0, 0, 0, 0.5)",

        // Glow effects
        "glow-purple": "0 0 20px rgba(139, 92, 246, 0.4)",
        "glow-purple-intense": "0 0 30px rgba(139, 92, 246, 0.6)",
        "glow-purple-soft": "0 0 40px rgba(139, 92, 246, 0.2)",

        // Button press effect
        "button-pressed": "inset 0 2px 4px rgba(0, 0, 0, 0.3)",

        // Ring for focus/hover states
        "ring-purple": "0 0 0 2px rgba(139, 92, 246, 0.4)",
        "ring-purple-glow": "0 0 0 2px rgba(139, 92, 246, 0.4), 0 0 20px rgba(139, 92, 246, 0.3)",
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

        // Glow animations
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "glow-soft": "glowSoft 3s ease-in-out infinite",

        // Loading animations
        "shimmer": "shimmer 2s linear infinite",
        "spin-slow": "spin 3s linear infinite",

        // Hover/Active states
        "press": "press 0.15s ease-out",
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
          "0%, 100%": { boxShadow: "0 0 20px rgba(139, 92, 246, 0.4)" },
          "50%": { boxShadow: "0 0 35px rgba(139, 92, 246, 0.6)" },
        },
        glowSoft: {
          "0%, 100%": { boxShadow: "0 0 15px rgba(139, 92, 246, 0.2)" },
          "50%": { boxShadow: "0 0 25px rgba(139, 92, 246, 0.35)" },
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
      },
      backgroundImage: {
        // Shimmer gradient for skeletons
        "shimmer": "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.04), transparent)",
        // Subtle gradient overlays
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-card": "linear-gradient(180deg, rgba(20, 20, 22, 0) 0%, rgba(20, 20, 22, 0.8) 100%)",
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
