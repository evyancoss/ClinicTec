/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#F7FFFD", // fondo principal
          100: "#D9F5EF", // fondos secundarios / seleccionados
          200: "#A7E3D4", // bordes y detalles
          500: "#5BB9A6", // acentos y botones primarios
          800: "#2F5D57", // navegación, encabezados, textos destacados
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
