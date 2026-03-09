import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  STORE_NAME,
  STORE_URL,
  STORE_EMAIL,
  STORE_WHATSAPP,
  BRAND_ORANGE,
} from "./shared"

type OrderEditCanceledData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderEditCanceledSubject(data: OrderEditCanceledData): string {
  const ref = data.display_id || data.order_id || ""
  return `Modificacion cancelada — Pedido #${ref} - ${STORE_NAME}`
}

export function orderEditCanceledTemplate(data: OrderEditCanceledData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Canceled icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEF3C7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#10007;</span>
      </div>
    </div>

    ${sectionTitle(`Modificacion cancelada — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("La modificacion solicitada para tu pedido ha sido cancelada. Tu pedido permanece sin cambios con los detalles originales.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: ${BRAND_ORANGE}; margin: 0 0 8px; font-weight: 600;">Necesitas ayuda?</p>
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; line-height: 1.8;">
        Si tienes preguntas, contactanos:<br/>
        Email: <a href="mailto:${STORE_EMAIL}" style="color: ${BRAND_ORANGE}; text-decoration: none;">${STORE_EMAIL}</a><br/>
        WhatsApp: <a href="https://wa.me/${STORE_WHATSAPP}" style="color: ${BRAND_ORANGE}; text-decoration: none;">Escribenos aqui</a>
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido", BRAND_ORANGE)}
    ${paragraph("Tu pedido original no ha sido modificado.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Modificacion cancelada para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
