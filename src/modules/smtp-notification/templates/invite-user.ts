import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  STORE_NAME,
  BRAND_GREEN,
} from "./shared"

type InviteUserData = {
  invite_link?: string
  [key: string]: unknown
}

export function inviteUserSubject(): string {
  return `Invitacion al equipo ${STORE_NAME}`
}

export function inviteUserTemplate(data: InviteUserData): string {
  const inviteLink = data.invite_link || "#"

  const content = `
    <!-- Team icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128101;</span>
      </div>
    </div>

    ${sectionTitle("Te han invitado al equipo")}
    ${paragraph("Hola,")}
    ${paragraph(`Has sido invitado a unirte al equipo de administracion de <strong>${STORE_NAME}</strong>. Acepta la invitacion para configurar tu cuenta y comenzar a gestionar la tienda.`)}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Al unirte tendras acceso al panel de administracion donde podras gestionar productos, pedidos y mas.
      </p>
    `)}

    ${ctaButton(inviteLink, "Aceptar invitacion")}
    ${paragraph("Si no esperabas esta invitacion, puedes ignorar este mensaje.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Te han invitado a unirte al equipo de ${STORE_NAME}`,
  })
}
