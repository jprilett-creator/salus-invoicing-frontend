/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        // Brand
        mint: { DEFAULT: "#2ECC8F", dim: "#E8F9F0", deep: "#1B7340", hover: "#28b07d" },
        // Neutrals
        page: "#FAFAFA",
        ink: { DEFAULT: "#000000", dim: "#272727", muted: "#666666" },
        "card-border": "#E6E6E6",
        // Semantic
        danger: { DEFAULT: "#E53935", bg: "#FCE8E8", deep: "#A02323" },
        warn: { DEFAULT: "#F57C00", bg: "#FFF4E5", deep: "#A35200" },
        neutral: { bg: "#F0F0F0", deep: "#444444" },
      },
      boxShadow: {
        none: "0 0 #0000",
      },
      borderRadius: {
        md: "0.375rem",
        lg: "0.5rem",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 200ms ease-out",
      },
    },
  },
  plugins: [],
};
