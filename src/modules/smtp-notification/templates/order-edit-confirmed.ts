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

type OrderEditConfirmedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderEditConfirmedSubject(data: OrderEditConfirmedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Modificacion confirmada — Pedido #${ref} - ${STORE_NAME}`
}

export function orderEditConfirmedTemplate(data: OrderEditConfirmedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Confirmed icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#10003;</span>
      </div>
    </div>

    ${sectionTitle(`Modificacion confirmada — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("La modificacion solicitada en tu pedido ha sido confirmada exitosamente. Los cambios ya se reflejan en tu pedido.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Puedes revisar el pedido actualizado en tu cuenta para verificar los cambios realizados.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido")}
    ${paragraph("Si tienes alguna pregunta, no dudes en contactarnos.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Modificacion confirmada para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
