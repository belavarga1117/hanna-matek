import { HttpError, badRequest } from './errors.js';

export async function readJson(req, maxBytes = 256 * 1024) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') throw new HttpError(415, 'UNSUPPORTED_MEDIA_TYPE', 'JSON tartalom szükséges.');
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'A kérés túl nagy.');
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object required');
    return parsed;
  } catch {
    throw badRequest('Érvénytelen JSON kérés.', 'INVALID_JSON');
  }
}

export function sendJson(res, status, value, extraHeaders = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    ...extraHeaders,
  });
  res.end(body);
}

export function parseCookies(header) {
  const cookies = {};
  for (const pair of String(header || '').split(';')) {
    const index = pair.indexOf('=');
    if (index < 1) continue;
    const key = pair.slice(0, index).trim();
    try { cookies[key] = decodeURIComponent(pair.slice(index + 1).trim()); } catch { /* ignore malformed cookie */ }
  }
  return cookies;
}

export function sessionCookie(value, { secure, maxAgeSeconds }) {
  const parts = [`hanna_session=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  if (maxAgeSeconds === 0) parts.push('Max-Age=0');
  else parts.push(`Max-Age=${maxAgeSeconds}`);
  return parts.join('; ');
}

export function routeMatch(pathname, pattern) {
  const match = pathname.match(pattern);
  return match ? match.slice(1).map(decodeURIComponent) : null;
}
