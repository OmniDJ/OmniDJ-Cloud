const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  theme: {
    fontFamily: {
      sans: ["Inter", "Work Sans", ...defaultTheme.fontFamily.sans]
    },
    extend: {}
  },
  variants: {},
  plugins: []
};
