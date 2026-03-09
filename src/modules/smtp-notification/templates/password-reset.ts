import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  STORE_NAME,
  BRAND_ORANGE,
} from "./shared"

type PasswordResetData = {
  url?: string
  [key: string]: unknown
}

export function passwordResetSubject(): string {
  return `Restablecer tu contrasena - ${STORE_NAME}`
}

export function passwordResetTemplate(data: PasswordResetData): string {
  const resetUrl = data.url || "#"

  const content = `
    <!-- Lock icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEF3C7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128274;</span>
      </div>
    </div>

    ${sectionTitle("Restablecer contrasena")}
    ${paragraph("Hola,")}
    ${paragraph("Recibimos una solicitud para restablecer la contrasena de tu cuenta en " + STORE_NAME + ". Haz clic en el boton para crear una nueva contrasena.")}

    ${ctaButton(resetUrl, "Restablecer contrasena", BRAND_ORANGE)}

    <div style="background-color: #FEF3C7; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #92400E; margin: 0;">
        Este enlace expira en 15 minutos. Si no solicitaste este cambio, puedes ignorar este mensaje.
      </p>
    </div>

    ${paragraph("Tu contrasena actual no sera modificada hasta que accedas al enlace y crees una nueva.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Solicitud de restablecimiento de contrasena — ${STORE_NAME}`,
  })
}
