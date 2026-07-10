import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: "#1B1A19",
          white: "#FFFFFF",
          "gray-light": "#F4F4F2",
          "gray-mid": "#68625F",
          border: "#DCDAD8",
          fill: "#E7E5E3",
          "fill-hover": "#DDDBD9",
          "border-soft": "#EDECEA",
        },
      },
      fontFamily: {
        sans: ["Apple SD Gothic Neo", "Helvetica Neue", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.25em",
        wide: "0.1em",
      },
    },
  },
  plugins: [],
};

export default config;
