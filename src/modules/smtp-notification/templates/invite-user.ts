import { emailWrapper, escapeHtml, BRAND_COLOR } from "./shared"

type InviteUserData = {
  invite_link?: string
  [key: string]: unknown
}

export function inviteUserSubject(): string {
  return "Te han invitado a NutriMercados Admin"
}

export function inviteUserTemplate(data: InviteUserData): string {
  const inviteLink = data.invite_link || "#"

  return emailWrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Hola,
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Has sido invitado a unirte al equipo de administracion de <strong>NutriMercados</strong>. Haz clic en el boton para aceptar la invitacion y configurar tu cuenta.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(inviteLink)}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
            Aceptar invitacion
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Si no esperabas esta invitacion, puedes ignorar este mensaje.
    </p>`)
}
