export class ApiError extends Error {
  constructor(message, {status = 0, code = 'NETWORK_ERROR', data = null} = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

export function createApiClient({getCsrf = () => null, onUnauthorized = () => {}, fetchImpl = globalThis.fetch} = {}) {
  async function request(path, {method = 'GET', body, headers = {}, signal} = {}) {
    if (!String(path).startsWith('/api/')) throw new TypeError('Csak same-origin API útvonal kérhető.');
    const upperMethod = method.toUpperCase();
    const requestHeaders = new Headers(headers);
    requestHeaders.set('Accept', 'application/json');
    if (body !== undefined) requestHeaders.set('Content-Type', 'application/json');
    if (!['GET', 'HEAD'].includes(upperMethod)) {
      const csrf = getCsrf();
      if (csrf) requestHeaders.set('X-CSRF-Token', csrf);
    }

    let response;
    try {
      response = await fetchImpl(path, {
        method: upperMethod,
        credentials: 'same-origin',
        headers: requestHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      throw new ApiError('Nem sikerült kapcsolódni. Ellenőrizd a hálózatot, majd próbáld újra.');
    }

    let data = null;
    const contentType = response.headers?.get?.('content-type') || '';
    try {
      if (response.status !== 204) data = contentType.includes('json') ? await response.json() : await response.text();
    } catch {
      throw new ApiError('A szerver válasza most nem olvasható.', {status: response.status, code: 'INVALID_RESPONSE'});
    }

    if (!response.ok) {
      if (response.status === 401) onUnauthorized();
      const serverError = data && typeof data === 'object' ? data.error : null;
      throw new ApiError(serverError?.message || defaultMessage(response.status), {
        status: response.status,
        code: serverError?.code || `HTTP_${response.status}`,
        data,
      });
    }
    return data;
  }

  return {
    request,
    get: (path, options) => request(path, {...options, method: 'GET'}),
    post: (path, body, options) => request(path, {...options, method: 'POST', body}),
    patch: (path, body, options) => request(path, {...options, method: 'PATCH', body}),
  };
}

function defaultMessage(status) {
  if (status === 400) return 'Ellenőrizd a megadott adatokat.';
  if (status === 401) return 'A munkameneted lejárt. Lépj be újra.';
  if (status === 403) return 'Ehhez a művelethez nincs jogosultságod.';
  if (status === 404) return 'A keresett adat nem található.';
  if (status === 409) return 'Az adat közben megváltozott. Frissítsd az oldalt, majd próbáld újra.';
  if (status === 429) return 'Túl sok kérés érkezett. Várj egy kicsit, majd próbáld újra.';
  if (status === 503) return 'A szolgáltatás átmenetileg nem érhető el.';
  return 'A kérés most nem sikerült. Próbáld újra.';
}
