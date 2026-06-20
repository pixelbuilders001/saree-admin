/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          DEFAULT: '#800020',
          dark: '#600018',
          light: '#A00028',
        },
        gold: {
          DEFAULT: '#D4AF37',
          dark: '#B5942D',
          light: '#E6C967',
        },
        cream: {
          DEFAULT: '#F5F5DC',
          dark: '#EBEBD0',
          light: '#FFFFEE',
        }
      },
    },
  },
  plugins: [],
}
