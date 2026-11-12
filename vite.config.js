import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * Política de seguridad de contenido (solo en producción; en desarrollo rompería la recarga en caliente).
 * Solo permite cargar recursos del propio sitio y, si está configurado, conectar con Supabase.
 * Ningún script, fuente, imagen remota ni conexión a terceros puede ejecutarse aunque alguien lo
 * añada por error: es el bloqueo técnico de rastreadores.
 */
function buildCsp(supabaseUrl) {
  let supabaseOrigin = '';
  if (supabaseUrl) {
    const { origin, host } = new URL(supabaseUrl);
    supabaseOrigin = ` ${origin} wss://${host}`;
  }
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${supabaseOrigin}`,
    "media-src 'none'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join('; ');
}

function contentSecurityPolicy(csp) {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    // Rutas relativas: el build funciona igual en la raíz de un dominio o en una subcarpeta
    // (p. ej. GitHub Pages en /Pizarra-Digital/). La app usa enrutado por hash, así que no
    // necesita reescrituras en el servidor.
    base: './',
    plugins: [react(), tailwindcss(), contentSecurityPolicy(buildCsp(env.VITE_SUPABASE_URL))],
    server: { port: 5173 },
  };
});
