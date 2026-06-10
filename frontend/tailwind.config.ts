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
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Custom Cyberpunk / Workstation theme colors
        cyber: {
          black: "#0B0F14",
          panel: "#131A1A",
          gray: "#1c2331",
          lightgray: "#2f3b52",
          green: "#00FF88",   // Primary Glow
          cyan: "#00E5FF",    // Accent Glow
          amber: "#ffb700",
          red: "#ff3366",
        }
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "ui-monospace", "Consolas", "Courier New", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
