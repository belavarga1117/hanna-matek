export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message, code = 'BAD_REQUEST') {
  return new HttpError(400, code, message);
}

export function unauthorized(message = 'Bejelentkezés szükséges.') {
  return new HttpError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Ehhez nincs jogosultságod.') {
  return new HttpError(403, 'FORBIDDEN', message);
}

export function notFound(message = 'A kért elem nem található.') {
  return new HttpError(404, 'NOT_FOUND', message);
}

export function conflict(message, code = 'CONFLICT') {
  return new HttpError(409, code, message);
}
