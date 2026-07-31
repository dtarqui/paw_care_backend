import rateLimit from "express-rate-limit";

// Freno anti fuerza-bruta específico para el login — 10 intentos cada 15 min por IP.
// El resto de la API no lo necesita: ya está detrás de requireAuth/JWT.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos." },
});
