const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  purge: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        cvx: {
          bg: "rgb(249, 247, 238)",
          bgPrimary: "rgb(243, 240, 237)",
          bgSecondary: "rgb(253, 252, 250)",
          bgTertiary: "rgb(240, 238, 235)",
          text: "rgb(42, 40, 37)",
          textSecondary: "rgb(120, 118, 113)",
          border: "rgba(33, 34, 30, 0.14)",
          red: "#EE342F",
          yellow: "#F3B01C",
          purple: "#8D2676",
          accent: "rgb(63, 82, 149)",
          link: "rgb(33, 34, 181)",
          success: "rgb(79, 176, 20)",
          warning: "rgb(243, 176, 28)",
          error: "rgb(238, 52, 47)",
        },
        primary: {
          DEFAULT: "#EE342F",
          hover: "#d42e29",
        },
        secondary: {
          DEFAULT: "rgb(120, 118, 113)",
          hover: "rgb(42, 40, 37)",
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
    },
  },
};
