export class AppError extends Error {
  constructor(
    readonly code: number,
    message: string,
    readonly httpStatus = 200,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
