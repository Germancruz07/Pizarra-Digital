import { createClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase. Solo se crea si existen las variables de entorno; si no, la app funciona
 * en modo local (todo en el navegador). La clave publicable/anon está pensada para ir en el
 * navegador: la seguridad la aplican las políticas RLS definidas en supabase/schema.sql.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isCloud = Boolean(url && key);

export const supabase = isCloud
  ? createClient(url, key, {
      auth: {
        storageKey: 'pd:supabase-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
      },
    })
  : null;

/** URL a la que vuelven los enlaces de los correos (confirmación y recuperación). */
export function redirectUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

/** Traduce los errores habituales de Supabase a mensajes claros en español. */
export function translateError(error) {
  if (!error) return new Error('Error desconocido.');
  const msg = (error.message || '').toLowerCase();
  const status = error.status;
  const map = [
    ['invalid login credentials', 'Correo o contraseña incorrectos.'],
    ['email not confirmed', 'Aún no has confirmado tu correo. Revisa tu bandeja de entrada (y la de spam).'],
    ['user already registered', 'Ya existe una cuenta con ese correo.'],
    ['token has expired or is invalid', 'El código no es válido o ha caducado. Pide uno nuevo.'],
    ['otp_expired', 'El código o el enlace han caducado. Pide uno nuevo.'],
    ['link is invalid or has expired', 'El enlace no es válido o ha caducado.'],
    ['should be different from the old password', 'La nueva contraseña debe ser distinta de la anterior.'],
    ['password should be at least', 'La contraseña es demasiado corta.'],
    ['weak password', 'La contraseña es demasiado débil. Usa al menos 8 caracteres mezclando letras y números.'],
    ['unable to validate email address', 'Introduce un correo electrónico válido.'],
    ['email address', 'Introduce un correo electrónico válido.'],
    ['for security purposes', 'Por seguridad, espera unos segundos antes de volver a intentarlo.'],
    [
      'email rate limit',
      'El servidor ha alcanzado su límite de correos por hora, así que ahora no puede enviar el correo de confirmación o de contraseña. Inténtalo de nuevo dentro de una hora.',
    ],
    ['rate limit', 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentarlo.'],
    ['failed to fetch', 'No hay conexión con el servidor. Revisa tu conexión a internet.'],
    ['jwt expired', 'Tu sesión caducó. Vuelve a iniciar sesión.'],
  ];
  for (const [needle, text] of map) if (msg.includes(needle)) return new Error(text);
  if (status === 429) return new Error('Demasiados intentos. Espera un momento y vuelve a intentarlo.');
  return new Error(error.message || 'Ha ocurrido un error con el servidor.');
}

export async function currentUserId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user?.id;
  if (!id) throw new Error('Tu sesión ha caducado. Vuelve a iniciar sesión.');
  return id;
}
