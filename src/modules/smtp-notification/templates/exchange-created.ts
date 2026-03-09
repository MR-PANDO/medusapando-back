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

type ExchangeCreatedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function exchangeCreatedSubject(data: ExchangeCreatedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Cambio solicitado — Pedido #${ref} - ${STORE_NAME}`
}

export function exchangeCreatedTemplate(data: ExchangeCreatedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Exchange icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEF3C7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128260;</span>
      </div>
    </div>

    ${sectionTitle(`Cambio solicitado — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Se ha registrado una solicitud de cambio para tu pedido. Te enviaremos las instrucciones para devolver los productos originales y recibir los nuevos.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Conserva los productos originales en su empaque. Te contactaremos con los pasos a seguir para completar el cambio.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido", BRAND_ORANGE)}
    ${paragraph("Procesaremos tu cambio lo antes posible.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Cambio solicitado para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
