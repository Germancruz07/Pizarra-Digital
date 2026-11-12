import { readJSON, writeJSON, removeKey } from '../storage/localStore';
import { uid } from '../../utils/id';
import { randomAvatar } from '../../data/avatars';

const USERS_KEY = 'pd:users';
const SESSION_KEY = 'pd:session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

function publicUser(user) {
  const { passwordHash, salt, ...rest } = user;
  return rest;
}

function readUsers() {
  return readJSON(USERS_KEY, []);
}

function validateName(name) {
  const n = (name || '').trim();
  if (n.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.');
  if (n.length > 40) throw new Error('El nombre no puede superar los 40 caracteres.');
  return n;
}

export const localAuthAdapter = {
  async register({ name, email, password, avatar }) {
    const cleanName = validateName(name);
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail)) throw new Error('Introduce un correo electrónico válido.');
    if (!password || password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');

    const users = readUsers();
    if (users.some((u) => u.email === cleanEmail)) throw new Error('Ya existe una cuenta con ese correo.');

    const salt = randomSalt();
    const user = {
      id: uid('usr_'),
      name: cleanName,
      email: cleanEmail,
      avatar: avatar || randomAvatar(),
      createdAt: Date.now(),
      salt,
      passwordHash: await hashPassword(password, salt),
    };
    writeJSON(USERS_KEY, [...users, user]);
    writeJSON(SESSION_KEY, { userId: user.id, at: Date.now() });
    return publicUser(user);
  },

  async login({ email, password }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) throw new Error('Introduce tu correo y contraseña.');
    const user = readUsers().find((u) => u.email === cleanEmail);
    if (!user || (await hashPassword(password, user.salt)) !== user.passwordHash) {
      throw new Error('Correo o contraseña incorrectos.');
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
    if (patch.name !== undefined) next.name = validateName(patch.name);
    if (patch.avatar !== undefined) next.avatar = patch.avatar;
    users[idx] = next;
    writeJSON(USERS_KEY, users);
    return publicUser(next);
  },
};
