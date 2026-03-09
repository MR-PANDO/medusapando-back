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

type FulfillmentCanceledData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function fulfillmentCanceledSubject(data: FulfillmentCanceledData): string {
  const ref = data.display_id || data.order_id || ""
  return `Envio cancelado — Pedido #${ref} - ${STORE_NAME}`
}

export function fulfillmentCanceledTemplate(data: FulfillmentCanceledData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Fulfillment canceled icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEE2E2; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128666;</span>
      </div>
    </div>

    ${sectionTitle(`Envio cancelado — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Te informamos que el envio de tu pedido ha sido cancelado. Nuestro equipo se pondra en contacto contigo para coordinar un nuevo envio.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: ${BRAND_ORANGE}; margin: 0 0 8px; font-weight: 600;">Necesitas ayuda?</p>
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; line-height: 1.8;">
        Si tienes preguntas, contactanos:<br/>
        Email: <a href="mailto:${STORE_EMAIL}" style="color: ${BRAND_ORANGE}; text-decoration: none;">${STORE_EMAIL}</a><br/>
        WhatsApp: <a href="https://wa.me/${STORE_WHATSAPP}" style="color: ${BRAND_ORANGE}; text-decoration: none;">Escribenos aqui</a>
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido", BRAND_ORANGE)}
    ${paragraph("Coordinamos un nuevo envio lo antes posible.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Envio cancelado para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
