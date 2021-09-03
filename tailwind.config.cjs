module.exports = {
  purge: ['./src/index.html', './src/**/*.svelte', './src/**/*.css'],
  darkMode: false,
  plugins: [require('@tailwindcss/typography')],
  variants: {
    extend: {
      borderWidth: ['last'],
      padding: ['first', 'last'],
      margin: ['first', 'last']
    }
  }
};
