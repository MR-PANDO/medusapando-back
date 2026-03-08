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

type OrderShippedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  tracking_number?: string
  tracking_url?: string
  carrier?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderShippedSubject(data: OrderShippedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Tu pedido #${ref} esta en camino - ${STORE_NAME}`
}

export function orderShippedTemplate(data: OrderShippedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const trackingHtml = data.tracking_number ? `
    ${infoBox(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="text-align: center;">
            ${data.carrier ? `<p style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #6B7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Transportadora</p>
            <p style="font-family: 'Inter', Arial, sans-serif; font-size: 16px; color: #1F2937; margin: 0 0 16px; font-weight: 600;">${escapeHtml(data.carrier)}</p>` : ""}
            <p style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #6B7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Numero de guia</p>
            <p style="font-family: 'Inter', monospace; font-size: 20px; color: ${BRAND_GREEN}; margin: 0; font-weight: 700; letter-spacing: 1.5px;">
              ${escapeHtml(data.tracking_number)}
            </p>
          </td>
        </tr>
      </table>
    `)}` : ""

  const trackingBtnUrl = data.tracking_url || `${storefrontUrl}/co/account/orders`
  const trackingBtnLabel = data.tracking_url ? "Rastrear mi pedido" : "Ver mi pedido"

  const content = `
    <!-- Shipped icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128666;</span>
      </div>
    </div>

    ${sectionTitle(`Pedido #${escapeHtml(ref)} en camino`)}
    ${paragraph(greeting)}
    ${paragraph("Tu pedido ha sido enviado y esta en camino hacia ti. Pronto recibiras tus productos saludables.")}

    ${trackingHtml}

    ${ctaButton(escapeHtml(trackingBtnUrl), trackingBtnLabel)}
    ${paragraph("Si tienes alguna pregunta sobre tu envio, no dudes en contactarnos.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Tu pedido #${ref} esta en camino — ${STORE_NAME}`,
  })
}
