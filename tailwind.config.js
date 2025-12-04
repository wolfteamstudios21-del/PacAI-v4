/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./client/src/**/*.{js,ts,jsx,tsx}', './client/index.html'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
      },
    },
  },
  plugins: [],
}
