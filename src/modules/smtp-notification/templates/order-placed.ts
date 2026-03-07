import { emailWrapper, escapeHtml, BRAND_COLOR } from "./shared"

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

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function orderPlacedSubject(data: OrderPlacedData): string {
  const ref = data.display_id || data.order_id || ""
  return `Confirmacion de pedido #${ref} - NutriMercados`
}

export function orderPlacedTemplate(data: OrderPlacedData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || "https://nutrimercados.com"
  const items = data.items || []
  const total = data.total ?? 0

  const itemsHtml = items.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
      <tr style="background-color: #f9f9f9;">
        <th style="padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #666;"></th>
        <th style="padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Producto</th>
        <th style="padding: 10px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Cant.</th>
        <th style="padding: 10px; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Precio</th>
      </tr>
      ${items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          ${item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title ?? "")}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif;">
          <strong>${escapeHtml(item.title ?? "Producto")}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-family: Arial, sans-serif;">
          ${item.quantity ?? 1}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-family: Arial, sans-serif;">
          ${item.unit_price != null ? formatCOP(item.unit_price) : ""}
        </td>
      </tr>`).join("")}
      <tr>
        <td colspan="3" style="padding: 12px; text-align: right; font-family: Arial, sans-serif; font-weight: bold;">Total:</td>
        <td style="padding: 12px; text-align: right; font-family: Arial, sans-serif; font-weight: bold; color: ${BRAND_COLOR}; font-size: 18px;">
          ${formatCOP(total)}
        </td>
      </tr>
    </table>` : ""

  const addressHtml = data.shipping_address ? `
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6;">
      <strong>Direccion de envio:</strong><br/>
      ${escapeHtml(data.shipping_address.address_1 ?? "")}<br/>
      ${escapeHtml(data.shipping_address.city ?? "")}${data.shipping_address.province ? `, ${escapeHtml(data.shipping_address.province)}` : ""}
    </p>` : ""

  return emailWrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      ${greeting}
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Hemos recibido tu pedido <strong>#${escapeHtml(ref)}</strong>. Gracias por tu compra.
    </p>
    ${itemsHtml}
    ${addressHtml}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(storefrontUrl)}/co/account/orders" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
            Ver mi pedido
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Te notificaremos cuando tu pedido sea enviado.
    </p>`)
}
