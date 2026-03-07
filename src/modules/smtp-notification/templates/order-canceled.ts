import { emailWrapper, escapeHtml } from "./shared"

type OrderCanceledData = {
  order_id?: string
  display_id?: string | number
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function orderCanceledSubject(data: OrderCanceledData): string {
  const ref = data.display_id || data.order_id || ""
  return `Pedido #${ref} cancelado - NutriMercados`
}

export function orderCanceledTemplate(data: OrderCanceledData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")

  return emailWrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      ${greeting}
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Tu pedido <strong>#${escapeHtml(ref)}</strong> ha sido cancelado.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Si tienes alguna pregunta sobre esta cancelacion o necesitas ayuda, no dudes en contactarnos.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Si esto fue un error, por favor comunicate con nuestro equipo de soporte lo antes posible.
    </p>`)
}
