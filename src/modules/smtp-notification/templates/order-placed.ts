import {
  emailWrapper,
  escapeHtml,
  formatCOP,
  ctaButton,
  sectionTitle,
  paragraph,
  divider,
  infoBox,
  productThumbnail,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
  BRAND_ORANGE,
} from "./shared"

type OrderPlacedData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  email?: string
  total?: number
  currency_code?: string
  items?: Array<{
    title?: string
    quantity?: number
    thumbnail?: string
    unit_price?: number
  }>
  shipping_address?: {
    address_1?: string
    city?: string
    province?: string
  }
  storefront_url?: string
  [key: string]: unknown
}

export function orderPlacedSubject(data: OrderPlacedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Pedido #${ref} confirmado - ${STORE_NAME}`
}

export function orderPlacedTemplate(data: OrderPlacedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL
  const items = data.items || []
  const total = data.total ?? 0

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const itemsHtml = items.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
      <tr style="background-color: ${BRAND_GREEN};">
        <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;"></th>
        <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Producto</th>
        <th style="padding: 10px 12px; text-align: center; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Cant.</th>
        <th style="padding: 10px 12px; text-align: right; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Precio</th>
      </tr>
      ${items.map((item, i) => `
      <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#f9fafb"};">
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${item.thumbnail ? productThumbnail(item.thumbnail, item.title ?? "") : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 14px; color: #1F2937;">
          <strong>${escapeHtml(item.title ?? "Producto")}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: ${FONT}; font-size: 14px; color: #4B5563;">
          ${item.quantity ?? 1}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: ${FONT}; font-size: 14px; color: #1F2937;">
          ${item.unit_price != null ? formatCOP(item.unit_price) : ""}
        </td>
      </tr>`).join("")}
      <tr>
        <td colspan="3" style="padding: 14px 12px; text-align: right; font-family: ${FONT}; font-weight: 700; font-size: 15px; color: #1F2937;">Total:</td>
        <td style="padding: 14px 12px; text-align: right; font-family: ${FONT}; font-weight: 700; font-size: 18px; color: ${BRAND_GREEN};">
          ${formatCOP(total)}
        </td>
      </tr>
    </table>` : ""

  const addressHtml = data.shipping_address ? `
    ${divider()}
    ${infoBox(`
      <p style="font-family: ${FONT}; font-size: 13px; color: ${BRAND_GREEN}; margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Direccion de envio</p>
      <p style="font-family: ${FONT}; font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">
        ${escapeHtml(data.shipping_address.address_1 ?? "")}<br/>
        ${escapeHtml(data.shipping_address.city ?? "")}${data.shipping_address.province ? `, ${escapeHtml(data.shipping_address.province)}` : ""}
      </p>
    `)}` : ""

  const content = `
    <!-- Order confirmed icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 32px;">&#10003;</span>
      </div>
    </div>

    ${sectionTitle(`Pedido #${escapeHtml(ref)} confirmado`)}
    ${paragraph(greeting)}
    ${paragraph("Hemos recibido tu pedido y lo estamos preparando. Gracias por confiar en nosotros para tus productos saludables.")}

    ${itemsHtml}
    ${addressHtml}

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/account/orders`, "Ver mi pedido")}
    ${paragraph("Te notificaremos cuando tu pedido sea enviado.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Pedido #${ref} confirmado — Gracias por tu compra en ${STORE_NAME}`,
  })
}
