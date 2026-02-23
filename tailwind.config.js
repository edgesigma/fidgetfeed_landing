/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./privacy-policy.html",
    "./deletion-request.html",
  ],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#4af530", hover: "#53f32e" },
        "brand-yellow": "#f0de04",
        dark: "#0a0a12",
        surface: "#111118",
        "surface-2": "#1a1a28",
        "surface-3": "#242438",
      },
      fontFamily: {
        display: ["'ChangaOne'", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
  ],
};
