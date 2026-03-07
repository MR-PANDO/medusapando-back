import nodemailer from "nodemailer"

// -- Shared utilities --

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

function formatCOP(amountInCents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amountInCents / 100)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

const BRAND_COLOR = "#2d6a4f"
const STORE_NAME = "NutriMercados"

function emailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_COLOR}; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; font-family: Arial, sans-serif; margin: 0; font-size: 24px;">
                ${STORE_NAME}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-family: Arial, sans-serif; font-size: 12px; color: #999; margin: 0;">
                ${STORE_NAME} &mdash; Tu tienda de productos saludables
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 12px; color: #999; margin: 5px 0 0;">
                Este es un correo automatizado.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// -- Payment Link Email (sent to customer) --

type PaymentLinkEmailParams = {
  to: string
  customerName?: string
  reference: string
  amountInCents: number
  checkoutUrl: string
  items?: Array<{
    title?: string
    quantity?: number
    thumbnail?: string
    unit_price?: number
  }>
}

export async function sendPaymentLinkEmail(params: PaymentLinkEmailParams) {
  const amount = formatCOP(params.amountInCents)
  const greeting = params.customerName
    ? `Hola ${escapeHtml(params.customerName)},`
    : "Hola,"

  const itemsHtml =
    params.items && params.items.length > 0
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
          <tr style="background-color: #f9f9f9;">
            <th style="padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #666;"></th>
            <th style="padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Producto</th>
            <th style="padding: 10px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Cant.</th>
            <th style="padding: 10px; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Precio</th>
          </tr>
          ${params.items
            .map(
              (item) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              ${
                item.thumbnail
                  ? `<img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title ?? "")}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />`
                  : ""
              }
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
          </tr>`
            )
            .join("")}
        </table>`
      : ""

  const content = `
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      ${greeting}
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Tu link de pago ha sido generado para el pedido <strong>#${escapeHtml(params.reference)}</strong>.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Total a pagar: <strong style="font-size: 20px; color: ${BRAND_COLOR};">${escapeHtml(amount)}</strong>
    </p>

    ${itemsHtml}

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(params.checkoutUrl)}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-family: Arial, sans-serif; font-size: 18px; font-weight: bold; text-decoration: none; padding: 16px 48px; border-radius: 8px;">
            Pagar ahora
          </a>
        </td>
      </tr>
    </table>

    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Haz clic en el boton para completar tu pago de forma segura a traves de Wompi.
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 13px; color: #999; line-height: 1.6; text-align: center;">
      Si no solicitaste este pago, puedes ignorar este mensaje.
    </p>`

  const transporter = createTransporter()

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Tu link de pago - Pedido #${params.reference} | ${STORE_NAME}`,
    html: emailWrapper(content),
  })
}

// -- Payment Status Email (sent to payment manager) --

type PaymentStatusEmailParams = {
  to: string
  orderId: string
  transactionId: string
  wompiStatus: string
  amountInCents: number
  currency?: string
  customerEmail?: string
  paymentMethodType?: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  APPROVED: { label: "APROBADO", color: "#16a34a" },
  DECLINED: { label: "RECHAZADO", color: "#dc2626" },
  VOIDED: { label: "ANULADO", color: "#6b7280" },
  ERROR: { label: "ERROR", color: "#ea580c" },
}

export async function sendPaymentStatusEmail(
  params: PaymentStatusEmailParams
) {
  const { label, color } =
    STATUS_LABELS[params.wompiStatus] ?? {
      label: params.wompiStatus,
      color: "#6b7280",
    }

  const amount = formatCOP(params.amountInCents)

  const content = `
    <h2 style="font-family: Arial, sans-serif; color: #111; margin: 0 0 20px;">Actualizacion de pago</h2>
    <table style="border-collapse:collapse;width:100%">
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Pedido</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;">${escapeHtml(params.orderId)}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Transaccion</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:13px;">${escapeHtml(params.transactionId)}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Estado</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;">
          <span style="background:${color};color:#fff;padding:4px 12px;border-radius:4px;font-weight:bold;font-family:Arial,sans-serif;">${escapeHtml(label)}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Monto</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">${escapeHtml(amount)}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Metodo</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">${escapeHtml(params.paymentMethodType ?? "N/A")}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Cliente</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">${escapeHtml(params.customerEmail ?? "N/A")}</td>
      </tr>
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-weight:bold;font-family:Arial,sans-serif;">Fecha</td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-family:Arial,sans-serif;">${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
      </tr>
    </table>`

  const transporter = createTransporter()

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: params.to,
    subject: `Pago ${label} - Pedido ${params.orderId} | ${STORE_NAME}`,
    html: emailWrapper(content),
  })
}
