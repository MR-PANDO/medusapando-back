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

type ReturnRequestedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function returnRequestedSubject(data: ReturnRequestedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Devolucion solicitada — Pedido #${ref} - ${STORE_NAME}`
}

export function returnRequestedTemplate(data: ReturnRequestedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Return icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEF3C7; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128230;</span>
      </div>
    </div>

    ${sectionTitle(`Devolucion solicitada — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Hemos recibido tu solicitud de devolucion. Nuestro equipo la revisara y te contactaremos con las instrucciones para proceder.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Te enviaremos las instrucciones de envio una vez aprobada la devolucion. Mientras tanto, conserva los productos en su empaque original.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido", BRAND_ORANGE)}
    ${paragraph("Procesaremos tu solicitud lo antes posible.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Devolucion solicitada para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
