/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#173726',
          medium: '#41b39a',
          deep: '#056052',
          offWhite: '#ffffff',
          sage: '#7ebea6',
          lightGray: '#d1d5db',
          mint: '#e5f9f4',
          black: '#101010',
          lime: '#9eefbc',
          tan: '#d5b48c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        logo: ['Bungee', 'cursive'],
      }
    }
  },
  plugins: [],
}
