import { emailWrapper, escapeHtml, BRAND_COLOR } from "./shared"

type PasswordResetData = {
  url?: string
  [key: string]: unknown
}

export function passwordResetSubject(): string {
  return "Restablecer tu contrasena - NutriMercados"
}

export function passwordResetTemplate(data: PasswordResetData): string {
  const resetUrl = data.url || "#"

  return emailWrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Hola,
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Recibimos una solicitud para restablecer la contrasena de tu cuenta. Haz clic en el boton a continuacion para crear una nueva contrasena.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(resetUrl)}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
            Restablecer contrasena
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contrasena no sera modificada.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #999; line-height: 1.6; text-align: center;">
      Este enlace expira en 1 hora.
    </p>`)
}
