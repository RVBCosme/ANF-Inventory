import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        page: "#F9E7E7",
        surface: "#FFFFFF",
        line: "#DED6D6",
        divider: "#D2CBCB",
        ash: "#ADA0A6",
        teal: "#7D938A",
        primary: { DEFAULT: "#4E6A60", hover: "#3E564E" },
        danger: { DEFAULT: "#B4534B", hover: "#9C463F" },
        warn: { DEFAULT: "#C9892F", surface: "#FBEFD6", text: "#5A4413" },
        ok: { surface: "#E3ECE7", text: "#3A5A4E" },
        ink: "#2E2A2B",
        muted: "#6B6266",
      },
      fontSize: {
        base: ["1.125rem", "1.6"],
      },
    },
  },
  plugins: [],
} satisfies Config;
