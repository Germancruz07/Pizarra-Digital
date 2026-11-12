import { supabase, redirectUrl, translateError } from './client';
import { readJSON, writeJSON, removeKey } from '../storage/localStore';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PENDING_AVATAR_KEY = 'pd:pendingAvatar';
export const MIN_PASSWORD = 8;

function validateEmail(email) {
  const e = (email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(e)) throw new Error('Introduce un correo electrónico válido.');
  return e;
}

export function validateNewPassword(password) {
  if (!password || password.length < MIN_PASSWORD) {
    throw new Error(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
}

function acceptanceRecord({ termsVersion, privacyVersion }, context) {
  return { type: 'terms', termsVersion, privacyVersion, acceptedAt: new Date().toISOString(), context };
}

async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw translateError(error);
  return data;
}

/** Una foto de avatar elegida al registrarse (antes de confirmar el correo) se aplica en el primer inicio de sesión. */
async function applyPendingAvatar(authUser, profile) {
  const pending = readJSON(PENDING_AVATAR_KEY, null);
  if (!pending || pending.email !== authUser.email || !profile) return profile;
  const { data, error } = await supabase.from('profiles').update({ avatar: pending.avatar }).eq('id', authUser.id).select().single();
  removeKey(PENDING_AVATAR_KEY);
  return error ? profile : data;
}

function toUser(authUser, profile) {
  const meta = authUser.user_metadata || {};
  return {
    id: authUser.id,
    email: authUser.email,
    name: profile?.name || meta.name || authUser.email.split('@')[0],
    avatar: profile?.avatar || meta.avatar || { type: 'initials', gradient: 0 },
    termsAcceptance: profile?.terms_acceptance || meta.terms_acceptance || null,
    consentLog: profile?.consent_log || [],
    needsWelcome: profile ? !profile.welcome_seeded : false,
    createdAt: authUser.created_at,
  };
}

async function loadUser(authUser) {
  let profile = await fetchProfile(authUser.id);
  profile = await applyPendingAvatar(authUser, profile);
  return toUser(authUser, profile);
}

export const supabaseAuthAdapter = {
  async register({ email, displayName, password, avatar, acceptance }) {
    const cleanEmail = validateEmail(email);
    validateNewPassword(password);
    if (!acceptance?.termsVersion || !acceptance?.privacyVersion) {
      throw new Error('Debes aceptar los Términos y condiciones y la Política de privacidad para crear la cuenta.');
    }
    const name = (displayName || '').trim().slice(0, 40) || cleanEmail.split('@')[0];
    const metadata = { name, terms_acceptance: acceptanceRecord(acceptance, 'registro') };
    // Las fotos no van en los metadatos (viajarían en cada token de sesión): se guardan en el perfil después.
    if (avatar && avatar.type !== 'image') metadata.avatar = avatar;
    if (avatar?.type === 'image') writeJSON(PENDING_AVATAR_KEY, { email: cleanEmail, avatar });

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: metadata, emailRedirectTo: redirectUrl() },
    });
    if (error) throw translateError(error);
    // Supabase no revela si el correo ya existe: devuelve un usuario sin identidades.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw new Error('Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.');
    }
    if (!data.session) return { needsConfirmation: true, email: cleanEmail };
    return { user: await loadUser(data.user) };
  },

  async login({ email, password }) {
    const cleanEmail = validateEmail(email);
    if (!password) throw new Error('Introduce tu contraseña.');
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) throw translateError(error);
    return loadUser(data.user);
  },

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw translateError(error);
  },

  async getCurrentUser() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return loadUser(data.session.user);
  },

  async loadUser(authUser) {
    return loadUser(authUser);
  },

  /** Suscripción a cambios de sesión (inicio, cierre, recuperación por enlace). Devuelve la función para cancelar. */
  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
    return () => data.subscription.unsubscribe();
  },

  async updateProfile(userId, patch) {
    const update = {};
    if (patch.name !== undefined) {
      const n = (patch.name || '').trim();
      if (n.length > 40) throw new Error('El nombre visible no puede superar los 40 caracteres.');
      update.name = n;
    }
    if (patch.avatar !== undefined) update.avatar = patch.avatar;
    const { error } = await supabase.from('profiles').update(update).eq('id', userId);
    if (error) throw translateError(error);
    const { data } = await supabase.auth.getUser();
    return loadUser(data.user);
  },

  async acceptTerms(userId, acceptance) {
    const profile = await fetchProfile(userId);
    const record = acceptanceRecord(acceptance, 'actualización de términos');
    const { error } = await supabase
      .from('profiles')
      .update({ terms_acceptance: record, consent_log: [...(profile?.consent_log || []), record] })
      .eq('id', userId);
    if (error) throw translateError(error);
    const { data } = await supabase.auth.getUser();
    return loadUser(data.user);
  },

  async markWelcomeSeeded(userId) {
    const { error } = await supabase.from('profiles').update({ welcome_seeded: true }).eq('id', userId);
    if (error) throw translateError(error);
  },

  async exportProfile(userId) {
    const { data } = await supabase.auth.getUser();
    const profile = await fetchProfile(userId);
    return {
      id: userId,
      email: data.user?.email,
      createdAt: data.user?.created_at,
      name: profile?.name,
      avatar: profile?.avatar,
      termsAcceptance: profile?.terms_acceptance,
      consentLog: profile?.consent_log,
    };
  },

  /** Borra la cuenta en el servidor (función delete_user de schema.sql). Las imágenes se borran antes desde el cliente. */
  async deleteAccount() {
    const { error } = await supabase.rpc('delete_user');
    if (error) throw translateError(error);
    await supabase.auth.signOut({ scope: 'local' });
  },

  /** Envía un correo con un código de 6 dígitos y un enlace para restablecer la contraseña. */
  async requestPasswordReset(email) {
    const cleanEmail = validateEmail(email);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo: redirectUrl() });
    if (error) throw translateError(error);
    return cleanEmail;
  },

  /** Verifica el código del correo; si es correcto, abre una sesión temporal para fijar la nueva contraseña. */
  async verifyRecoveryCode(email, code) {
    const cleanEmail = validateEmail(email);
    const token = (code || '').replace(/\s+/g, '');
    if (!/^\d{6,10}$/.test(token)) throw new Error('Escribe el código numérico que recibiste por correo.');
    const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type: 'recovery' });
    if (error) throw translateError(error);
  },

  async updatePassword(password) {
    validateNewPassword(password);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw translateError(error);
  },
};
