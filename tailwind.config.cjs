module.exports = {
  purge: ['./src/index.html', './src/**/*.svelte', './src/**/*.css'],
  darkMode: false,
  variants: {
    extend: {}
  },
  plugins: [require('@tailwindcss/typography')]
};
