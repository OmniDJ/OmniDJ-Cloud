const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["./src/**/*.js"],
  css: ["./src/**/*.css"]
});

module.exports = {
  plugins: [
    require("postcss-import"),
    require("tailwindcss"),
    require("autoprefixer"),
    // ...[purgecss]
    ...(process.env.NODE_ENV === "production" ? [purgecss] : [])
  ]
};
