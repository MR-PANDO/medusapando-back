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

type TransferRequestedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function transferRequestedSubject(data: TransferRequestedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Transferencia de pedido — Pedido #${ref} - ${STORE_NAME}`
}

export function transferRequestedTemplate(data: TransferRequestedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Transfer icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #EFF6FF; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128587;</span>
      </div>
    </div>

    ${sectionTitle(`Transferencia de pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Se ha solicitado transferir la propiedad de un pedido a tu cuenta. Puedes revisar los detalles del pedido en tu cuenta.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Si no esperabas esta transferencia, por favor contactanos para que podamos verificar la solicitud.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mis pedidos")}
    ${paragraph("Si tienes preguntas sobre esta transferencia, no dudes en contactarnos.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Transferencia de pedido #${ref} solicitada — ${STORE_NAME}`,
  })
}
