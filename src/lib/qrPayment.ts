// Punto de conexión con el banco elegido para generar cobros por QR (riel "QR Simple"
// interoperable de Bolivia — ver database/MODELO_DATOS.md y docs/COMPARATIVA_MERCADO_VETERINARIO.md).
// A diferencia de lib/mailer.ts (SMTP es un protocolo estándar, cualquier proveedor
// funciona igual), cada banco boliviano expone su propia API propietaria sin
// documentación técnica pública — no hay forma honesta de escribir la llamada HTTP
// real sin adivinar su contrato. Por eso este archivo separa las dos partes:
//
//  - generateBankQrCharge: SIEMPRE falla con un error claro hoy. No es un "si no
//    está configurado, falla" — es "esta función todavía no puede llamar a ningún
//    banco real". Ver el TODO abajo para lo que falta cuando lleguen las
//    credenciales/spec reales.
//  - verifyWebhookNotification: SÍ es funcional ya (comparación de secreto
//    compartido) — es una verificación mínima real, no un placeholder falso;
//    se puede reforzar después si el banco elegido usa firma HMAC en vez de un
//    secreto estático.

export class QrPaymentProviderNotConfiguredError extends Error {
  constructor() {
    super(
      "El cobro por QR bancario no está disponible todavía en este entorno — falta conectar la API real del banco elegido (ver lib/qrPayment.ts)"
    );
    this.name = "QrPaymentProviderNotConfiguredError";
  }
}

export interface GenerateQrChargeInput {
  amount: number;
  /** Texto descriptivo para el banco (ej. "Atencion #123 - PawCare"), no un ID interno sensible. */
  reference: string;
}

export interface BankQrChargeResult {
  externalReference: string;
  /** Contenido a codificar como imagen QR, o la URL de la imagen si el banco la devuelve ya generada. */
  qrPayload: string;
  expiresAt: Date;
}

/**
 * TODO(banco real): reemplazar este cuerpo por la llamada HTTP real cuando se
 * tengan las credenciales/documentación técnica del banco elegido (BCP, Banco
 * Unión, BNB, etc.):
 *   1. Leer PAGO_QR_API_URL / PAGO_QR_API_KEY (o el esquema de auth que pida ese
 *      banco) de `process.env`.
 *   2. Hacer el POST real de generación de QR con el `input.amount`/`input.reference`.
 *   3. Mapear la respuesta del banco a { externalReference, qrPayload, expiresAt }.
 * Nada en `qrPayment.service.ts`, las rutas o el frontend necesita cambiar cuando esto
 * se implemente — ya están armados contra este contrato.
 */
export async function generateBankQrCharge(_input: GenerateQrChargeInput): Promise<BankQrChargeResult> {
  throw new QrPaymentProviderNotConfiguredError();
}

/**
 * Verificación mínima del webhook de confirmación: compara un secreto compartido
 * enviado en un header contra PAGO_QR_WEBHOOK_SECRET. Suficiente como control de
 * acceso real mientras no se conoce el esquema de firma exacto del banco elegido
 * (varios sí soportan un secreto estático como opción) — si el banco usa HMAC
 * sobre el cuerpo crudo, reforzar acá sin tocar el resto del flujo.
 */
export function verifyWebhookNotification(receivedSecret: string | undefined): boolean {
  const expectedSecret = process.env.PAGO_QR_WEBHOOK_SECRET;
  if (!expectedSecret || !receivedSecret) return false;
  return receivedSecret === expectedSecret;
}
