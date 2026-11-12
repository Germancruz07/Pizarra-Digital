import { readJSON, writeJSON, removeKey } from '../storage/localStore';
import { uid } from '../../utils/id';
import { randomAvatar } from '../../data/avatars';

const USERS_KEY = 'pd:users';
const SESSION_KEY = 'pd:session';
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/;

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Hash de respaldo (cyrb53 iterado) para contextos sin crypto.subtle (http no seguro). */
function fallbackHash(str) {
  let out = '';
  for (let round = 0; round < 4; round++) {
    let h1 = 0xdeadbeef ^ round;
    let h2 = 0x41c6ce57 ^ round;
    const s = out + str;
    for (let i = 0; i < s.length; i++) {
      const ch = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    out += (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  }
  return out;
}

async function hashPassword(password, salt) {
  const input = `${salt}:${password}`;
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(input);
    return toHex(await crypto.subtle.digest('SHA-256', data));
  }
  return fallbackHash(input);
}

function randomSalt() {
  if (globalThis.crypto?.getRandomValues) return toHex(crypto.getRandomValues(new Uint8Array(16)));
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Datos que la app puede ver del usuario (nunca el hash ni la sal). */
function publicUser(user) {
  const { passwordHash, salt, ...rest } = user;
  return rest;
}

function readUsers() {
  return readJSON(USERS_KEY, []);
}

function normalizeUsername(value) {
  return (value || '').trim().toLowerCase();
}

function validateUsername(value) {
  const u = normalizeUsername(value);
  if (!USERNAME_RE.test(u)) {
    throw new Error('El usuario debe tener entre 3 y 30 caracteres: letras sin acentos, números, punto, guion o guion bajo.');
  }
  return u;
}

function validateDisplayName(name, fallback) {
  const n = (name || '').trim();
  if (!n) return fallback;
  if (n.length > 40) throw new Error('El nombre visible no puede superar los 40 caracteres.');
  return n;
}

/** Registro de aceptación de términos: quién (id de cuenta), qué versiones, cuándo y en qué contexto. */
function acceptanceRecord({ termsVersion, privacyVersion }, context) {
  return { type: 'terms', termsVersion, privacyVersion, acceptedAt: new Date().toISOString(), context };
}

export const localAuthAdapter = {
  async register({ username, displayName, password, avatar, acceptance }) {
    const cleanUsername = validateUsername(username);
    if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
    if (!acceptance?.termsVersion || !acceptance?.privacyVersion) {
      throw new Error('Debes aceptar los Términos y condiciones y la Política de privacidad para crear la cuenta.');
    }

    const users = readUsers();
    if (users.some((u) => u.username === cleanUsername || u.email === cleanUsername)) {
      throw new Error('Ese nombre de usuario ya existe en este navegador. Prueba con otro.');
    }

    const record = acceptanceRecord(acceptance, 'registro');
    const salt = randomSalt();
    const user = {
      id: uid('usr_'),
      username: cleanUsername,
      name: validateDisplayName(displayName, cleanUsername),
      avatar: avatar || randomAvatar(),
      createdAt: Date.now(),
      termsAcceptance: record,
      consentLog: [record],
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    writeJSON(USERS_KEY, [...users, user]);
    writeJSON(SESSION_KEY, { userId: user.id, at: Date.now() });
    return { user: { ...publicUser(user), needsWelcome: true } };
  },

  /** En local la pizarra de bienvenida se crea justo al registrarse; no hay nada que marcar. */
  async markWelcomeSeeded() {},

  async login({ username, password }) {
    const id = normalizeUsername(username);
    if (!id || !password) throw new Error('Introduce tu usuario y tu contraseña.');
    // Las cuentas creadas antes de este cambio iniciaban sesión con correo: se siguen aceptando.
    const user = readUsers().find((u) => u.username === id || u.email === id);
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      throw new Error('Usuario o contraseña incorrectos.');
    }
    writeJSON(SESSION_KEY, { userId: user.id, at: Date.now() });
    return publicUser(user);
  },

  async logout() {
    removeKey(SESSION_KEY);
  },

  async getCurrentUser() {
    const session = readJSON(SESSION_KEY, null);
    if (!session?.userId) return null;
    const user = readUsers().find((u) => u.id === session.userId);
    return user ? publicUser(user) : null;
  },

  async updateProfile(userId, patch) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('No se encontró el usuario.');
    const next = { ...users[idx] };
    if (patch.name !== undefined) next.name = validateDisplayName(patch.name, next.username || next.name);
    if (patch.avatar !== undefined) next.avatar = patch.avatar;
    users[idx] = next;
    writeJSON(USERS_KEY, users);
    return publicUser(next);
  },

  /** Acepta una nueva versión de los términos (cuentas creadas antes de esa versión). */
  async acceptTerms(userId, acceptance) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('No se encontró el usuario.');
    const record = acceptanceRecord(acceptance, 'actualización de términos');
    users[idx] = { ...users[idx], termsAcceptance: record, consentLog: [...(users[idx].consentLog || []), record] };
    writeJSON(USERS_KEY, users);
    return publicUser(users[idx]);
  },

  /** Perfil completo para la descarga de datos (sin hash ni sal de la contraseña). */
  async exportProfile(userId) {
    const user = readUsers().find((u) => u.id === userId);
    if (!user) throw new Error('No se encontró el usuario.');
    return publicUser(user);
  },

  /** Borra la cuenta de este navegador y cierra la sesión. */
  async deleteAccount(userId) {
    writeJSON(
      USERS_KEY,
      readUsers().filter((u) => u.id !== userId)
    );
    removeKey(SESSION_KEY);
  },
};
