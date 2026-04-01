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
          DEFAULT: '#534AB7',
          light: '#EEEDFE',
          mid: '#AFA9EC',
          dark: '#3C3489',
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      borderRadius: {
        btn: '12px',
      },
    },
  },
  plugins: [],
};
export default config;
