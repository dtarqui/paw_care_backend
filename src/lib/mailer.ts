import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

// Sin las SMTP_* configuradas, el transporter queda null a propósito — mismo criterio
// que el resto del proyecto (ver HU11 Track B en TASKS.md): nunca fingir un envío que
// no ocurrió. enviarEmail() falla con un error claro en vez de tragarse el error.
const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

export class EmailNoConfiguradoError extends Error {
  constructor() {
    super("El envío de email no está configurado en este entorno (faltan las variables SMTP_* — ver backend/.env.example)");
    this.name = "EmailNoConfiguradoError";
  }
}

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function enviarEmail(input: EmailInput): Promise<void> {
  if (!transporter) {
    throw new EmailNoConfiguradoError();
  }
  await transporter.sendMail({
    from: `"PawCare" <${SMTP_FROM}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
