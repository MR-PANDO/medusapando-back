import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  STORE_NAME,
  STORE_URL,
  BRAND_ORANGE,
} from "./shared"

type OrderEditRequestedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderEditRequestedSubject(data: OrderEditRequestedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Modificacion solicitada — Pedido #${ref} - ${STORE_NAME}`
}

export function orderEditRequestedTemplate(data: OrderEditRequestedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Edit icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEF3C7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#9998;</span>
      </div>
    </div>

    ${sectionTitle(`Modificacion solicitada — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Se ha solicitado una modificacion en tu pedido. Revisaremos los cambios y te notificaremos cuando sean confirmados o si necesitamos informacion adicional.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Revisa los detalles de la modificacion en tu cuenta para asegurarte de que todo este correcto.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido", BRAND_ORANGE)}
    ${paragraph("Si no solicitaste esta modificacion, por favor contactanos de inmediato.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Modificacion solicitada para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
