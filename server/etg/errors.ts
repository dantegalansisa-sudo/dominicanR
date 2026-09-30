/**
 * Error de la API de ETG: siempre HTTP 500 con { code, error }, ninguno de los
 * dos vacío, y el mensaje nombra el campo exacto ("offer_id is required").
 */
export class EtgError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 500) {
    super(message);
    this.name = 'EtgError';
    this.code = code;
    this.status = status;
  }
}

export const errorBody = (err: unknown) => {
  if (err instanceof EtgError) {
    return { code: err.code || 'ERROR', error: err.message || 'Unexpected error' };
  }
  return { code: 'INTERNAL_ERROR', error: 'Unexpected technical error, please retry' };
};
