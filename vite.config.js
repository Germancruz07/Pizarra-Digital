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

/**
 * Una clave SECRETA de Supabase (sb_secret_… o un JWT con rol service_role) nunca debe llegar al
 * navegador: daría acceso total a la base de datos saltándose las reglas RLS. Si se configura por
 * error, se descarta, la app se compila en modo local y se avisa en el registro de la compilación.
 */
function isSecretKey(key = '') {
  if (key.startsWith('sb_secret_')) return true;
  const parts = key.split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      return payload.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  const define = {};
  if (isSecretKey(key)) {
    const msg =
      'Se configuró una clave SECRETA de Supabase en VITE_SUPABASE_PUBLISHABLE_KEY. Se ha descartado y la app se compila en modo local. ' +
      'Usa la clave publicable (sb_publishable_…) y anula la clave secreta en Supabase → Project Settings → API Keys.';
    console.error(`\n::error::${msg}\n`);
    env.VITE_SUPABASE_URL = '';
    for (const name of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY']) {
      define[`import.meta.env.${name}`] = '""';
    }
  }
  return {
    define,
    // Rutas relativas: el build funciona igual en la raíz de un dominio o en una subcarpeta
    // (p. ej. GitHub Pages en /Pizarra-Digital/). La app usa enrutado por hash, así que no
    // necesita reescrituras en el servidor.
    base: './',
    plugins: [react(), tailwindcss(), contentSecurityPolicy(buildCsp(env.VITE_SUPABASE_URL))],
    server: { port: 5173 },
  };
});
