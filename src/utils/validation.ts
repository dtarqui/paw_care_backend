const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function esEmailValido(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
