/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        spotlight: "spotlight 2s ease .75s 1 forwards",
        shimmer: "shimmer 2s linear infinite",
        "moving-border": "moving-border 4s infinite linear",
        scroll: "scroll var(--animation-duration, 40s) var(--animation-direction, forwards) linear infinite",
        aurora: "aurora 60s linear infinite",
        "meteor-effect": "meteor 5s linear infinite",
      },
      keyframes: {
        spotlight: {
          "0%": { opacity: 0, transform: "translate(-72%, -62%) scale(0.5)" },
          "100%": { opacity: 1, transform: "translate(-50%, -40%) scale(1)" },
        },
        shimmer: {
          from: { backgroundPosition: "0 0" },
          to: { backgroundPosition: "-200% 0" },
        },
        "moving-border": {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scroll: {
          to: { transform: "translate(calc(-50% - 0.5rem))" },
        },
        aurora: {
          from: { backgroundPosition: "50% 50%, 50% 50%" },
          to: { backgroundPosition: "350% 50%, 350% 50%" },
        },
        meteor: {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: 1 },
          "70%": { opacity: 1 },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: 0,
          },
        },
      },
      colors: {
        neutral: { 950: "#0a0a0a" },
      },
      backgroundImage: {
        "grid-white": "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
        "grid-black": "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke='rgb(0 0 0 / 0.04)'%3e%3cpath d='M0 .5H31.5V32'/%3e%3c/svg%3e\")",
        "dot-white": "radial-gradient(circle, #ffffff33 1px, transparent 1px)",
        "dot-black": "radial-gradient(circle, #00000033 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
