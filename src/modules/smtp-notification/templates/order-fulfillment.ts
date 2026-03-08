import {
  emailWrapper,
  escapeHtml,
  formatCOP,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  productThumbnail,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
  BRAND_ORANGE,
} from "./shared"

type FulfillmentItem = {
  title?: string
  quantity?: number
  thumbnail?: string
  unit_price?: number
  original_title?: string
  is_replacement?: boolean
}

type OrderFulfillmentData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  items?: FulfillmentItem[]
  has_replacements?: boolean
  note?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderFulfillmentSubject(data: OrderFulfillmentData): string {
  const ref = data.display_id || data.order_id || ""
  if (data.has_replacements) {
    return `Pedido #${ref} preparado (con reemplazos) - ${STORE_NAME}`
  }
  return `Pedido #${ref} preparado para envio - ${STORE_NAME}`
}

export function orderFulfillmentTemplate(data: OrderFulfillmentData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL
  const items = data.items || []
  const hasReplacements = data.has_replacements ?? items.some(i => i.is_replacement)

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const mainMessage = hasReplacements
    ? "Tu pedido ha sido preparado. Algunos productos no estaban disponibles y fueron reemplazados por alternativas equivalentes."
    : "Tu pedido ha sido preparado y todos los productos estan listos. Pronto sera enviado."

  const itemsHtml = items.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
      <tr style="background-color: ${BRAND_GREEN};">
        <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;"></th>
        <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Producto</th>
        <th style="padding: 10px 12px; text-align: center; font-family: ${FONT}; font-size: 12px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px;">Cant.</th>
      </tr>
      ${items.map((item, i) => {
        const rowBg = item.is_replacement ? "#FEF3C7" : (i % 2 === 0 ? "#ffffff" : "#f9fafb")
        return `
      <tr style="background-color: ${rowBg};">
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${item.thumbnail ? productThumbnail(item.thumbnail, item.title ?? "") : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 14px; color: #1F2937;">
          <strong>${escapeHtml(item.title ?? "Producto")}</strong>
          ${item.is_replacement && item.original_title ? `<br/><span style="font-size: 12px; color: ${BRAND_ORANGE}; font-weight: 600;">&#8635; Reemplazo de: ${escapeHtml(item.original_title)}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: ${FONT}; font-size: 14px; color: #4B5563;">
          ${item.quantity ?? 1}
        </td>
      </tr>`
      }).join("")}
    </table>` : ""

  const replacementNotice = hasReplacements ? `
    <div style="background-color: #FEF3C7; border-radius: 8px; padding: 16px; margin: 20px 0; border-left: 4px solid ${BRAND_ORANGE};">
      <p style="font-family: ${FONT}; font-size: 14px; color: #92400E; margin: 0; font-weight: 600;">
        &#9888; Nota sobre reemplazos
      </p>
      <p style="font-family: ${FONT}; font-size: 13px; color: #92400E; margin: 8px 0 0; line-height: 1.6;">
        Los productos resaltados en amarillo fueron reemplazados porque el producto original no estaba disponible. Si tienes alguna pregunta, contactanos antes de que se realice el envio.
      </p>
    </div>` : ""

  const noteHtml = data.note ? `
    ${infoBox(`
      <p style="font-family: ${FONT}; font-size: 13px; color: ${BRAND_GREEN}; margin: 0 0 8px; font-weight: 600;">Nota del equipo</p>
      <p style="font-family: ${FONT}; font-size: 14px; color: #374151; margin: 0; line-height: 1.6;">${escapeHtml(data.note as string)}</p>
    `)}` : ""

  const content = `
    <!-- Fulfillment icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: ${hasReplacements ? "#FEF3C7" : "#f0f7ec"}; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">${hasReplacements ? "&#9888;" : "&#128230;"}</span>
      </div>
    </div>

    ${sectionTitle(`Pedido #${escapeHtml(ref)} preparado`)}
    ${paragraph(greeting)}
    ${paragraph(mainMessage)}

    ${replacementNotice}
    ${itemsHtml}
    ${noteHtml}

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/account/orders`, "Ver mi pedido")}
    ${paragraph("Te notificaremos cuando tu pedido sea enviado con la informacion de rastreo.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: hasReplacements
      ? `Pedido #${ref} preparado con reemplazos — ${STORE_NAME}`
      : `Pedido #${ref} preparado para envio — ${STORE_NAME}`,
  })
}
