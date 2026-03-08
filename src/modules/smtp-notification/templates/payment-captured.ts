import {
  emailWrapper,
  escapeHtml,
  formatCOP,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
} from "./shared"

type PaymentCapturedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  amount?: number
  currency_code?: string
  storefront_url?: string
  [key: string]: unknown
}

export function paymentCapturedSubject(data: PaymentCapturedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Pago confirmado - Pedido #${ref} | ${STORE_NAME}`
}

export function paymentCapturedTemplate(data: PaymentCapturedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL
  const amount = data.amount ?? 0

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const content = `
    <!-- Payment confirmed icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0fdf4; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px; color: #16a34a;">&#10003;</span>
      </div>
    </div>

    ${sectionTitle("Pago confirmado")}
    ${paragraph(greeting)}
    ${paragraph(`El pago de tu pedido <strong>#${escapeHtml(ref)}</strong> ha sido procesado exitosamente.`)}

    <!-- Amount highlight -->
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #f0f7ec 100%); border-radius: 10px; padding: 24px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="font-family: ${FONT}; font-size: 13px; color: #6B7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Monto cobrado</p>
      <p style="font-family: ${FONT}; font-size: 28px; color: ${BRAND_GREEN}; margin: 0; font-weight: 700;">
        ${escapeHtml(formatCOP(amount))}
      </p>
    </div>

    ${infoBox(`
      <p style="font-family: ${FONT}; font-size: 14px; color: #374151; margin: 0; text-align: center; line-height: 1.6;">
        Tu pedido esta siendo preparado y te notificaremos cuando sea enviado con la informacion de rastreo.
      </p>
    `)}

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/account/orders`, "Ver mi pedido")}
    ${paragraph("Gracias por tu compra. Si tienes alguna pregunta, no dudes en contactarnos.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Pago confirmado por ${formatCOP(amount)} — Pedido #${ref} | ${STORE_NAME}`,
  })
}
