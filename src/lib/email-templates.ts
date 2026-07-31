const ESTILO_BOTON =
  "display:inline-block;padding:12px 24px;background:#7b3bed;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;";
const ESTILO_CONTENEDOR =
  "font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b;";
const ESTILO_PIE = "font-size:12px;color:#71717a;margin-top:24px;";

function envoltorio(contenido: string): string {
  return `<div style="${ESTILO_CONTENEDOR}"><h2 style="margin-top:0;">🐾 PawCare</h2>${contenido}</div>`;
}

export function plantillaRecuperacionPassword(nombre: string, link: string): string {
  return envoltorio(`
    <p>Hola ${nombre},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña. Si fuiste tú, hacé clic en el botón de abajo — el enlace vence en 1 hora.</p>
    <a href="${link}" style="${ESTILO_BOTON}">Restablecer contraseña</a>
    <p style="${ESTILO_PIE}">Si no pediste este cambio, ignora este correo — tu contraseña actual sigue funcionando sin cambios.</p>
  `);
}

export function plantillaInvitacionVeterinario(nombre: string | undefined, nombreAdmin: string, link: string): string {
  return envoltorio(`
    <p>Hola${nombre ? ` ${nombre}` : ""},</p>
    <p>${nombreAdmin} te invitó a unirte a PawCare como Veterinario. Hacé clic en el botón de abajo para completar tu registro — el enlace vence en 7 días.</p>
    <a href="${link}" style="${ESTILO_BOTON}">Completar registro</a>
    <p style="${ESTILO_PIE}">Si no esperabas esta invitación, podés ignorar este correo.</p>
  `);
}
