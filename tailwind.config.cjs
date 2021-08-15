const sansSerif = {
  fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"'
};

module.exports = {
  purge: ['./src/index.html', './src/**/*.svelte', './src/**/*.css'],
  darkMode: false,
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
            h1: sansSerif,
            h2: sansSerif,
            h3: sansSerif,
            h4: sansSerif,
            h5: sansSerif
          }
        }
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: [require('@tailwindcss/typography')]
};
