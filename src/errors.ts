export class UserFacingError extends Error {
  constructor(message: string, public readonly fix?: string) {
    super(message);
    this.name = 'UserFacingError';
  }
}
