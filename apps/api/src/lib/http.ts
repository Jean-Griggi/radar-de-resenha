export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function notFound(message = 'Não encontrado') {
  return new HttpError(404, message);
}

export function forbidden(message = 'Sem permissão') {
  return new HttpError(403, message);
}

export function conflict(message: string) {
  return new HttpError(409, message);
}

export function badRequest(message: string) {
  return new HttpError(400, message);
}

export function unauthorized(message = 'Não autorizado') {
  return new HttpError(401, message);
}
