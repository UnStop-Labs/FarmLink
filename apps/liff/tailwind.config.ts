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
        primary: {
          DEFAULT: "#2D7A35",
          light: "#E8F5E9",
          dark: "#1B5E20",
        },
      },
      fontFamily: {
        sans: ["-apple-system", "Noto Sans Thai", "Helvetica Neue", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
