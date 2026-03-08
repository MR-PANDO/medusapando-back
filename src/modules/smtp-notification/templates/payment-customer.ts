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
  STORE_EMAIL,
  STORE_WHATSAPP,
  BRAND_GREEN,
  BRAND_ORANGE,
} from "./shared"

type PaymentCustomerData = {
  customer_name?: string
  order_id?: string
  display_id?: string | number
  wompi_status?: string
  amount_in_cents?: number
  payment_method?: string
  storefront_url?: string
  [key: string]: unknown
}

const STATUS_CONFIG: Record<string, {
  label: string
  icon: string
  iconBg: string
  color: string
  title: string
  message: string
}> = {
  APPROVED: {
    label: "APROBADO",
    icon: "&#10003;",
    iconBg: "#f0fdf4",
    color: "#16a34a",
    title: "Pago aprobado",
    message: "Tu pago ha sido aprobado exitosamente. Estamos preparando tu pedido.",
  },
  DECLINED: {
    label: "RECHAZADO",
    icon: "&#10007;",
    iconBg: "#fef2f2",
    color: "#dc2626",
    title: "Pago rechazado",
    message: "Lamentamos informarte que tu pago no fue aprobado. Puedes intentar nuevamente con otro medio de pago.",
  },
  VOIDED: {
    label: "ANULADO",
    icon: "&#10007;",
    iconBg: "#f9fafb",
    color: "#6b7280",
    title: "Pago anulado",
    message: "Tu pago ha sido anulado. Si se realizo algun cobro, sera reembolsado en los proximos dias habiles.",
  },
  ERROR: {
    label: "ERROR",
    icon: "&#9888;",
    iconBg: "#fff7ed",
    color: "#ea580c",
    title: "Error en el pago",
    message: "Hubo un error al procesar tu pago. Por favor intenta nuevamente o contactanos para ayudarte.",
  },
}

export function paymentCustomerSubject(data: PaymentCustomerData): string {
  const status = STATUS_CONFIG[data.wompi_status ?? ""] ?? STATUS_CONFIG.ERROR
  const ref = data.display_id || data.order_id || ""
  return `${status.title} - Pedido #${ref} | ${STORE_NAME}`
}

export function paymentCustomerTemplate(data: PaymentCustomerData): string {
  const name = data.customer_name || ""
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"
  const ref = String(data.display_id || data.order_id || "")
  const storefrontUrl = data.storefront_url || STORE_URL
  const amountInCents = (data.amount_in_cents as number) ?? 0
  const amount = amountInCents > 0 ? formatCOP(amountInCents / 100) : ""
  const status = STATUS_CONFIG[data.wompi_status ?? ""] ?? STATUS_CONFIG.ERROR
  const isApproved = data.wompi_status === "APPROVED"
  const isFailed = ["DECLINED", "ERROR"].includes(data.wompi_status ?? "")

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const amountBox = amount ? `
    <div style="background-color: #f9fafb; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="font-family: ${FONT}; font-size: 12px; color: #6B7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Monto</p>
      <p style="font-family: ${FONT}; font-size: 24px; color: ${status.color}; margin: 0; font-weight: 700;">${escapeHtml(amount)}</p>
      ${data.payment_method ? `<p style="font-family: ${FONT}; font-size: 13px; color: #6B7280; margin: 8px 0 0;">${escapeHtml(data.payment_method as string)}</p>` : ""}
    </div>` : ""

  const contactBox = isFailed ? `
    ${infoBox(`
      <p style="font-family: ${FONT}; font-size: 13px; color: ${BRAND_ORANGE}; margin: 0 0 8px; font-weight: 600;">Necesitas ayuda?</p>
      <p style="font-family: ${FONT}; font-size: 14px; color: #374151; margin: 0; line-height: 1.8;">
        Contactanos para resolver cualquier inconveniente:<br/>
        Email: <a href="mailto:${STORE_EMAIL}" style="color: ${BRAND_ORANGE}; text-decoration: none;">${STORE_EMAIL}</a><br/>
        WhatsApp: <a href="https://wa.me/${STORE_WHATSAPP}" style="color: ${BRAND_ORANGE}; text-decoration: none;">Escribenos aqui</a>
      </p>
    `)}` : ""

  const ctaLabel = isApproved ? "Ver mi pedido" : "Reintentar pago"
  const ctaUrl = isApproved
    ? `${escapeHtml(storefrontUrl)}/co/account/orders`
    : `${escapeHtml(storefrontUrl)}/co/account/orders`
  const ctaColor = isApproved ? BRAND_GREEN : BRAND_ORANGE

  const content = `
    <!-- Status icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: ${status.iconBg}; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px; color: ${status.color};">${status.icon}</span>
      </div>
    </div>

    <!-- Status badge -->
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="display: inline-block; background-color: ${status.iconBg}; color: ${status.color}; padding: 6px 20px; border-radius: 20px; font-weight: 700; font-family: ${FONT}; font-size: 13px; letter-spacing: 0.5px;">
        ${escapeHtml(status.label)}
      </span>
    </div>

    ${sectionTitle(`Pedido #${escapeHtml(ref)}`)}
    ${paragraph(greeting)}
    ${paragraph(status.message)}

    ${amountBox}
    ${contactBox}

    ${ctaButton(ctaUrl, ctaLabel, ctaColor)}
    ${paragraph("Gracias por confiar en " + STORE_NAME + ".", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `${status.title} — Pedido #${ref} | ${STORE_NAME}`,
  })
}
