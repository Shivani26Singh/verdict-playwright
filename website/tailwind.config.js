/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Light theme. Names kept from the original dark palette (ink/paper/
        // line/signal) so components didn't need per-file rewrites — only
        // the values flipped. "ink" now means "surface", lightest at 950.
        ink: {
          950: "#f6f7f9",
          900: "#ffffff",
          850: "#ffffff",
          800: "#ffffff",
          700: "#eef1f4",
          600: "#e5e9ed",
          500: "#dde2e7",
        },
        line: {
          DEFAULT: "#e3e7eb",
          soft: "#edf0f3",
        },
        paper: {
          DEFAULT: "#161a1f",
          dim: "#5b6470",
          faint: "#8a919b",
        },
        signal: {
          DEFAULT: "#157a3d",
          bright: "#1a9c4d",
          dim: "#0f5f30",
          muted: "#0c4a26",
        },
        warn: "#a35a12",
        bad: "#b3261e",
        // Fixed-dark palette for terminal/code chrome, which stays dark
        // intentionally regardless of the page theme (see CodeBlock.jsx).
        term: {
          bg: "#0c0e10",
          panel: "#15181c",
          border: "#262b31",
          text: "#d7dadd",
          dim: "#8b9299",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,32,0.04), 0 8px 24px -12px rgba(16,24,32,0.12)",
        glow: "0 0 0 1px rgba(21,122,61,0.18), 0 0 24px -6px rgba(21,122,61,0.25)",
      },
      backgroundImage: {
        grid: "linear-gradient(rgba(21,122,61,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(21,122,61,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
    },
  },
  plugins: [],
};
