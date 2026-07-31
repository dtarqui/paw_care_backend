// FRONTEND_URL puede traer varios orígenes separados por coma (ver app.ts, CORS) —
// para armar un link de email se usa el primero, con un fallback de desarrollo.
export function frontendBaseUrl(): string {
  const primero = (process.env.FRONTEND_URL ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean)[0];
  return primero ?? "http://localhost:5173";
}
