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

type ClaimCreatedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function claimCreatedSubject(data: ClaimCreatedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Reclamo registrado — Pedido #${ref} - ${STORE_NAME}`
}

export function claimCreatedTemplate(data: ClaimCreatedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL

  const content = `
    <!-- Claim icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #FEE2E2; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128221;</span>
      </div>
    </div>

    ${sectionTitle(`Reclamo registrado — Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph("Hemos registrado un reclamo para tu pedido. Nuestro equipo revisara tu caso y te contactaremos con una solucion lo antes posible.")}

    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151; margin: 0; text-align: center;">
        Estamos comprometidos con tu satisfaccion. Revisaremos tu reclamo y te ofreceremos una solucion adecuada.
      </p>
    `)}

    ${ctaButton(`${storefrontUrl}/co/account/orders`, "Ver mi pedido", BRAND_ORANGE)}
    ${paragraph("Lamentamos los inconvenientes. Trabajaremos para resolverlo rapidamente.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Reclamo registrado para tu pedido #${ref} — ${STORE_NAME}`,
  })
}
