import type { Config } from "tailwindcss";

const oklchVar = (name: string) => `oklch(var(--${name}-c) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1280px",
      },
    },
    extend: {
      fontFamily: {
        sans:  ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
        mono:  ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        bg:              oklchVar("bg"),
        surface:         oklchVar("surface"),
        "surface-2":     oklchVar("surface-2"),
        "surface-3":     oklchVar("surface-3"),
        border:          oklchVar("border"),
        "border-strong": oklchVar("border-strong"),
        // Hairline has a fixed 0.22 alpha — don't let Tailwind's alpha-value override it.
        hairline:        "var(--hairline)",
        ring:            oklchVar("ring"),

        fg:       oklchVar("fg"),
        "fg-dim": oklchVar("fg-dim"),
        muted:    oklchVar("muted"),
        subtle:   oklchVar("subtle"),
        ink:      oklchVar("ink"),

        ok:       oklchVar("ok"),
        warn:     oklchVar("warn"),
        critical: oklchVar("critical"),
        info:     oklchVar("info"),

        primary: {
          DEFAULT: oklchVar("fg"),
          fg:      oklchVar("bg"),
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
        lg: "var(--radius-lg)",
        md: "var(--radius)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
