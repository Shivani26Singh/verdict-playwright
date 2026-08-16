/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        observed: {
          DEFAULT: "#0ea5e9",
          bg: "#f0f9ff",
          border: "#bae6fd",
        },
        assessment: {
          DEFAULT: "#8b5cf6",
          bg: "#f5f3ff",
          border: "#ddd6fe",
        },
        ink: "#1e293b",
        muted: "#64748b",
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
