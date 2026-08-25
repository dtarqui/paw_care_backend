// El cuerpo de los emails va en español (lo lee el usuario final); solo los
// identificadores están en inglés, igual que en el resto del proyecto.

const BUTTON_STYLE =
  "display:inline-block;padding:12px 24px;background:#7b3bed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;";
const CONTAINER_STYLE =
  "font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b;";
const FOOTER_STYLE = "font-size:12px;color:#71717a;margin-top:24px;";

function wrapper(content: string): string {
  return `<div style="${CONTAINER_STYLE}"><h2 style="margin-top:0;">🐾 PawCare</h2>${content}</div>`;
}

export function passwordResetTemplate(name: string, link: string): string {
  return wrapper(`
    <p>Hola ${name},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, hacé clic en el botón de abajo — el enlace vence en 1 hora.</p>
    <a href="${link}" style="${BUTTON_STYLE}">Restablecer contraseña</a>
    <p style="${FOOTER_STYLE}">Si no pediste este cambio, ignora este correo — tu contraseña actual sigue funcionando sin cambios.</p>
  `);
}

export function vetInvitationTemplate(name: string | undefined, adminName: string, link: string): string {
  return wrapper(`
    <p>Hola${name ? ` ${name}` : ""},</p>
    <p>${adminName} te invitó a unirte a PawCare como Veterinario. Hacé clic en el botón de abajo para completar tu registro — el enlace vence en 7 días.</p>
    <a href="${link}" style="${BUTTON_STYLE}">Completar registro</a>
    <p style="${FOOTER_STYLE}">Si no esperabas esta invitación, podés ignorar este correo.</p>
  `);
}
