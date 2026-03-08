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
  BRAND_GREEN,
  BRAND_ORANGE,
} from "./shared"

type OrderDeliveredData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderDeliveredSubject(data: OrderDeliveredData): string {
  const ref = data.display_id || data.order_id || ""
  return `Pedido #${ref} entregado - ${STORE_NAME}`
}

export function orderDeliveredTemplate(data: OrderDeliveredData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const content = `
    <!-- Delivered icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#127881;</span>
      </div>
    </div>

    ${sectionTitle(`Pedido #${escapeHtml(ref)} entregado`)}
    ${paragraph(greeting)}
    ${paragraph("Tu pedido ha sido entregado exitosamente. Esperamos que disfrutes tus productos saludables.")}

    <!-- Thank you box -->
    <div style="background: linear-gradient(135deg, #f0f7ec 0%, #fdf6f0 100%); border-radius: 10px; padding: 24px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="font-family: ${FONT}; font-size: 24px; margin: 0 0 8px;">&#128155;</p>
      <p style="font-family: ${FONT}; font-size: 16px; color: ${BRAND_GREEN}; margin: 0; font-weight: 600;">
        Gracias por tu compra
      </p>
      <p style="font-family: ${FONT}; font-size: 14px; color: #6B7280; margin: 8px 0 0;">
        Tu apoyo nos ayuda a seguir llevando productos saludables a tu mesa.
      </p>
    </div>

    ${infoBox(`
      <p style="font-family: ${FONT}; font-size: 13px; color: ${BRAND_GREEN}; margin: 0 0 8px; font-weight: 600;">Algo no esta bien con tu pedido?</p>
      <p style="font-family: ${FONT}; font-size: 14px; color: #374151; margin: 0; line-height: 1.8;">
        Si tienes algun inconveniente con tu entrega, contactanos:<br/>
        Email: <a href="mailto:${STORE_EMAIL}" style="color: ${BRAND_ORANGE}; text-decoration: none;">${STORE_EMAIL}</a><br/>
        WhatsApp: <a href="https://wa.me/${STORE_WHATSAPP}" style="color: ${BRAND_ORANGE}; text-decoration: none;">Escribenos aqui</a>
      </p>
    `)}

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/store`, "Seguir comprando")}
    ${paragraph("Gracias por confiar en " + STORE_NAME + " — tu mercado saludable desde 2012.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Tu pedido #${ref} fue entregado — Gracias por comprar en ${STORE_NAME}`,
  })
}
