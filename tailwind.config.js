/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/**/*.html', './public/js/**/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        brand: {
          50: '#eff5ff', 100: '#dce8ff', 200: '#bcd3ff', 500: '#3b78f2',
          600: '#2563eb', 700: '#1d4fcf', 800: '#1a3fa3'
        }
      }
    }
  },
  plugins: []
};
