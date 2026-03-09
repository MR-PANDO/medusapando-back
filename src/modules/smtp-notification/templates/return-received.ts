import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
} from "./shared"

type ReturnReceivedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function returnReceivedSubject(data: ReturnReceivedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Devolucion recibida — Pedido #${ref} - ${STORE_NAME}`
}

export function returnReceivedTemplate(data: ReturnReceivedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Return received icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#10003;</span>
      </div>
    </div>

    ${sectionTitle(`Devolucion recibida — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Hemos recibido los productos de tu devolucion. Estamos revisando el estado de los articulos y procesaremos tu reembolso pronto.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        El reembolso se procesara una vez completada la revision. Te notificaremos cuando el reembolso haya sido realizado.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido")}
    ${paragraph("Gracias por tu paciencia durante este proceso.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Devolucion recibida para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
