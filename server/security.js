import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { badRequest } from './errors.js';

const scrypt = promisify(scryptCallback);
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 64;

export function opaqueToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

export async function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${Buffer.from(key).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  if (typeof password !== 'string' || typeof encoded !== 'string') return false;
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, nText, rText, pText, saltText, keyText] = parts;
  const N = Number(nText);
  const r = Number(rText);
  const p = Number(pText);
  if (N !== SCRYPT_N || r !== SCRYPT_R || p !== SCRYPT_P) return false;
  let expected;
  let salt;
  try {
    expected = Buffer.from(keyText, 'base64url');
    salt = Buffer.from(saltText, 'base64url');
  } catch {
    return false;
  }
  if (expected.length !== KEY_LENGTH || salt.length < 16) return false;
  const actual = Buffer.from(await scrypt(password, salt, expected.length, { N, r, p, maxmem: 64 * 1024 * 1024 }));
  return timingSafeEqual(actual, expected);
}

export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) {
    throw badRequest('A jelszó legalább 10 és legfeljebb 200 karakter lehet.', 'INVALID_PASSWORD');
  }
}

export function normalizeUsername(username) {
  if (typeof username !== 'string') throw badRequest('Érvénytelen felhasználónév.', 'INVALID_USERNAME');
  const value = username.normalize('NFKC').trim();
  if (!/^[\p{L}\p{N}][\p{L}\p{N}._-]{2,31}$/u.test(value) || value.includes('@')) {
    throw badRequest('A felhasználónév 3–32 betűből, számból, pontból, kötőjelből vagy aláhúzásból állhat, és nem lehet email-cím.', 'INVALID_USERNAME');
  }
  return { username: value, key: value.toLocaleLowerCase('hu-HU') };
}

export function validateDisplayName(value) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) {
    throw badRequest('A megjelenített név 1–120 karakter lehet.', 'INVALID_DISPLAY_NAME');
  }
  return value.trim();
}

export function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}
