/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // These match your SSMC Excel layout
        'excel-management': '#FFF2CC',
        'excel-clinical': '#FCE4D6',
        'excel-research': '#E2EFDA',
        'excel-education': '#FBE5D6',
      }
    },
  },
  plugins: [],
}
