import {
  emailWrapper,
  escapeHtml,
  formatCOP,
  ctaButton,
  sectionTitle,
  paragraph,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
  BRAND_ORANGE,
} from "./shared"

type AbandonedCartData = {
  storefront_url?: string
  cart_id?: string
  items?: Array<{
    title?: string
    quantity?: number
    thumbnail?: string
    variant_title?: string
    unit_price?: number
  }>
  customer_name?: string
  reminder_number?: number
  [key: string]: unknown
}

const SUBJECTS: Record<number, string> = {
  1: `Tu carrito te espera en ${STORE_NAME}`,
  2: `Tus productos saludables te esperan`,
  3: `Ultima oportunidad — tu carrito expira pronto`,
}

const MESSAGES: Record<number, { intro: string; cta: string; icon: string; preheader: string }> = {
  1: {
    intro: "Notamos que dejaste algunos productos en tu carrito. No te preocupes, los guardamos para ti.",
    cta: "Completar mi compra",
    icon: "&#128722;",
    preheader: "Tus productos saludables te esperan en el carrito",
  },
  2: {
    intro: "Tus productos favoritos siguen esperandote. Completa tu pedido antes de que se agoten.",
    cta: "Volver a mi carrito",
    icon: "&#9200;",
    preheader: "No olvides tus productos — completa tu pedido",
  },
  3: {
    intro: "Esta es tu ultima oportunidad — tu carrito expira pronto y no queremos que pierdas tus productos saludables.",
    cta: "Completar mi compra ahora",
    icon: "&#9888;",
    preheader: "Ultima oportunidad — tu carrito expira pronto",
  },
}

export function getAbandonedCartSubject(reminderNumber: number): string {
  return SUBJECTS[reminderNumber] || SUBJECTS[1]
}

export function abandonedCartTemplate(data: AbandonedCartData): string {
  const storefrontUrl = data.storefront_url || STORE_URL
  const cartId = data.cart_id || ""
  const items = data.items || []
  const customerName = data.customer_name || ""
  const reminderNumber = data.reminder_number || 1

  const recoveryUrl = `${storefrontUrl}/co/cart/recover/${cartId}`
  const greeting = customerName ? `Hola ${escapeHtml(customerName)},` : "Hola,"
  const message = MESSAGES[reminderNumber] || MESSAGES[1]

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const ctaColor = reminderNumber >= 3 ? BRAND_ORANGE : BRAND_GREEN

  const itemsHtml = items.length > 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
      <tr style="background-color: #f9fafb;">
        <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;"></th>
        <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Producto</th>
        <th style="padding: 10px 12px; text-align: center; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Cant.</th>
        <th style="padding: 10px 12px; text-align: right; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Precio</th>
      </tr>
      ${items.map((item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${item.thumbnail ? `<img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title ?? "")}" style="width: 56px; height: 56px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb;" />` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 14px; color: #1F2937;">
          <strong>${escapeHtml(item.title || "Producto")}</strong>
          ${item.variant_title ? `<br/><span style="color: #6B7280; font-size: 13px;">${escapeHtml(item.variant_title)}</span>` : ""}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center; font-family: ${FONT}; font-size: 14px; color: #4B5563;">
          ${item.quantity || 1}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: ${FONT}; font-size: 14px; color: #1F2937;">
          ${item.unit_price != null ? formatCOP(item.unit_price / 100) : ""}
        </td>
      </tr>`).join("")}
    </table>` : ""

  const content = `
    <!-- Cart icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: ${reminderNumber >= 3 ? "#FEF3C7" : "#f0f7ec"}; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">${message.icon}</span>
      </div>
    </div>

    ${sectionTitle(reminderNumber >= 3 ? "Ultima oportunidad" : "Tu carrito te espera")}
    ${paragraph(greeting)}
    ${paragraph(message.intro)}

    ${itemsHtml}

    ${ctaButton(recoveryUrl, message.cta, ctaColor)}
    ${paragraph("Si tienes alguna pregunta, no dudes en contactarnos por WhatsApp o correo.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, { preheader: message.preheader })
}
