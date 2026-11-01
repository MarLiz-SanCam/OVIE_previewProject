/** @type {import('tailwindcss').Config} */
export default {
  // Las plantillas en JS (tablas del comparador, nav y tarjetas generadas) también usan clases de Tailwind
  content: ['./src/**/*.html', './src/assets/js/**/*.js', './vite-plugins/**/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50:'#fdf5f7',100:'#fce4eb',200:'#f4b8ca',300:'#e87898',
                 400:'#d43a6a',500:'#be1a4d',600:'#a01040',700:'#8a1535',
                 800:'#701040',900:'#4a0620',950:'#2d0315' },
        gold:  { 50:'#faf5e8',100:'#f4e9c8',300:'#e0c080',400:'#d4aa60',
                 500:'#c0a050',600:'#a88838',700:'#856a15' },
      },
    },
  },
  plugins: [],
};
