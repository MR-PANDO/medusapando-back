import { emailWrapper, escapeHtml, BRAND_COLOR } from "./shared"

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
  return `Tu pedido #${ref} ha sido enviado - NutriMercados`
}

export function orderShippedTemplate(data: OrderShippedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || "https://nutrimercados.com"

  const trackingHtml = data.tracking_number ? `
    <div style="background-color: #f9f9f9; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; margin: 0 0 8px;">
        ${data.carrier ? `<strong>${escapeHtml(data.carrier)}</strong> — ` : ""}Numero de guia:
      </p>
      <p style="font-family: monospace; font-size: 18px; color: #333; margin: 0; letter-spacing: 1px;">
        ${escapeHtml(data.tracking_number)}
      </p>
    </div>` : ""

  const trackingBtnUrl = data.tracking_url || `${storefrontUrl}/co/account/orders`
  const trackingBtnLabel = data.tracking_url ? "Rastrear mi pedido" : "Ver mi pedido"

  return emailWrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      ${greeting}
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Tu pedido <strong>#${escapeHtml(ref)}</strong> ha sido enviado y esta en camino.
    </p>
    ${trackingHtml}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(trackingBtnUrl)}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
            ${trackingBtnLabel}
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Te avisaremos cuando tu pedido sea entregado.
    </p>`)
}
