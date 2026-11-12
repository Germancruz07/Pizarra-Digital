/**
 * Datos legales y de contacto en un solo lugar.
 * Al cambiar los Términos o la Privacidad de forma relevante, sube la versión correspondiente:
 * a las cuentas existentes se les pedirá aceptar la nueva versión al entrar.
 */
export const CONTACT_EMAIL = 'gdominguez2704@gmail.com';
export const SITE_OWNER = 'el titular de la cuenta de GitHub «Germancruz07»';
export const REPO_URL = 'https://github.com/Germancruz07/Pizarra-Digital';
export const SITE_URL = 'https://germancruz07.github.io/Pizarra-Digital/';

export const TERMS_VERSION = '2026-11-11.2';
export const PRIVACY_VERSION = '2026-11-11.2';
export const COOKIES_VERSION = '2026-11-11.2';
export const LAST_UPDATED = '11 de noviembre de 2026';

/**
 * Modo nube (Supabase): región del proyecto y servicio que envía los correos de la cuenta.
 * Se rellenan desde las variables de entorno de compilación para que los textos legales
 * describan exactamente la configuración publicada.
 */
export const CLOUD_REGION = import.meta.env.VITE_SUPABASE_REGION || '';
export const EMAIL_SENDER = import.meta.env.VITE_EMAIL_SENDER || 'el servicio de correo de Supabase';
