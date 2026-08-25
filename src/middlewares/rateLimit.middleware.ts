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

// El preregistro de veterinario también es público (sin JWT) — mismo motivo que el
// login, pero más laxo: es normal corregir un campo y reenviar el formulario varias veces.
export const preRegistrationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes de registro. Intenta de nuevo más tarde." },
});

// "Olvidé mi contraseña" es público y dispara un envío de email real — sin límite,
// alguien podría usarlo para spamear la bandeja de un tercero repitiendo su username.
export const forgotPasswordRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demasiadas solicitudes de recuperación. Intenta de nuevo más tarde." },
});
