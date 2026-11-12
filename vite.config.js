import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Rutas relativas: el build funciona igual en la raíz de un dominio o en una subcarpeta
  // (p. ej. GitHub Pages en /Pizarra-Digital/). La app usa enrutado por hash, así que no
  // necesita reescrituras en el servidor.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
