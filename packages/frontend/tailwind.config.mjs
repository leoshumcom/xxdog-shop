/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f0',
          100: '#f9eddb',
          200: '#f2d7b0',
          300: '#e9bb7b',
          400: '#e09a46',
          500: '#d9822b',
          600: '#c96b22',
          700: '#a7521e',
          800: '#86421f',
          900: '#6d381b',
          950: '#3a1c0c',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
