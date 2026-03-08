import { sendEmail } from "./email-sender"
import type EmailAuditModuleService from "../modules/email-audit/service"
import {
  emailWrapper,
  escapeHtml,
  formatCOP as formatCOPFull,
  ctaButton,
  sectionTitle,
  paragraph,
  divider,
  infoBox,
  productThumbnail,
  STORE_NAME,
  BRAND_GREEN,
  BRAND_ORANGE,
} from "../modules/smtp-notification/templates/shared"

function formatCOP(amountInCents: number): string {
  return formatCOPFull(amountInCents / 100)
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
  auditService?: EmailAuditModuleService
}

export async function sendPaymentLinkEmail(params: PaymentLinkEmailParams) {
  const amount = formatCOP(params.amountInCents)
  const greeting = params.customerName
    ? `Hola ${escapeHtml(params.customerName)},`
    : "Hola,"

  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const itemsHtml =
    params.items && params.items.length > 0
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
          <tr style="background-color: #f9fafb;">
            <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;"></th>
            <th style="padding: 10px 12px; text-align: left; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Producto</th>
            <th style="padding: 10px 12px; text-align: center; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Cant.</th>
            <th style="padding: 10px 12px; text-align: right; font-family: ${FONT}; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Precio</th>
          </tr>
          ${params.items
            .map(
              (item) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              ${
                item.thumbnail
                  ? productThumbnail(item.thumbnail, item.title ?? "")
                  : ""
              }
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
          </tr>`
            )
            .join("")}
        </table>`
      : ""

  const content = `
    <!-- Payment icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#128179;</span>
      </div>
    </div>

    ${sectionTitle("Link de pago generado")}
    ${paragraph(greeting)}
    ${paragraph(`Tu link de pago ha sido generado para el pedido <strong>#${escapeHtml(params.reference)}</strong>.`)}

    <!-- Amount highlight -->
    <div style="background: linear-gradient(135deg, #f0f7ec 0%, #fdf6f0 100%); border-radius: 10px; padding: 24px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="font-family: ${FONT}; font-size: 13px; color: #6B7280; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Total a pagar</p>
      <p style="font-family: ${FONT}; font-size: 28px; color: ${BRAND_GREEN}; margin: 0; font-weight: 700;">
        ${escapeHtml(amount)}
      </p>
    </div>

    ${itemsHtml}

    ${ctaButton(escapeHtml(params.checkoutUrl), "Pagar ahora")}

    <div style="background-color: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="font-family: ${FONT}; font-size: 13px; color: #6B7280; margin: 0;">
        &#128274; Pago seguro a traves de <strong>Wompi</strong> — procesador de pagos certificado
      </p>
    </div>

    ${paragraph("Si no solicitaste este pago, puedes ignorar este mensaje.", { muted: true, center: true, small: true })}`

  const subject = `Link de pago - Pedido #${params.reference} | ${STORE_NAME}`

  await sendEmail(
    {
      to: params.to,
      subject,
      html: emailWrapper(content, {
        preheader: `Tu link de pago por ${amount} esta listo — ${STORE_NAME}`,
      }),
      email_type: "payment-link",
      metadata: { reference: params.reference, amountInCents: params.amountInCents },
    },
    params.auditService
  )
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
  auditService?: EmailAuditModuleService
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "APROBADO", color: "#16a34a", bg: "#f0fdf4" },
  DECLINED: { label: "RECHAZADO", color: "#dc2626", bg: "#fef2f2" },
  VOIDED: { label: "ANULADO", color: "#6b7280", bg: "#f9fafb" },
  ERROR: { label: "ERROR", color: "#ea580c", bg: "#fff7ed" },
}

export async function sendPaymentStatusEmail(
  params: PaymentStatusEmailParams
) {
  const { label, color, bg } =
    STATUS_LABELS[params.wompiStatus] ?? {
      label: params.wompiStatus,
      color: "#6b7280",
      bg: "#f9fafb",
    }

  const amount = formatCOP(params.amountInCents)
  const FONT = `'Inter', Arial, Helvetica, sans-serif`

  const content = `
    ${sectionTitle("Actualizacion de pago Wompi")}

    <!-- Status badge -->
    <div style="text-align: center; margin: 20px 0;">
      <span style="display: inline-block; background-color: ${bg}; color: ${color}; padding: 8px 24px; border-radius: 20px; font-weight: 700; font-family: ${FONT}; font-size: 14px; letter-spacing: 0.5px; border: 1px solid ${color}20;">
        ${escapeHtml(label)}
      </span>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-family: ${FONT}; font-size: 14px; color: #374151; width: 140px;">Pedido</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; color: #1F2937;">${escapeHtml(params.orderId)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-family: ${FONT}; font-size: 14px; color: #374151;">Transaccion</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 13px; color: #1F2937;">${escapeHtml(params.transactionId)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-family: ${FONT}; font-size: 14px; color: #374151;">Monto</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 16px; color: ${BRAND_GREEN}; font-weight: 700;">${escapeHtml(amount)}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-family: ${FONT}; font-size: 14px; color: #374151;">Metodo</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 14px; color: #1F2937;">${escapeHtml(params.paymentMethodType ?? "N/A")}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-family: ${FONT}; font-size: 14px; color: #374151;">Cliente</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 14px; color: #1F2937;">${escapeHtml(params.customerEmail ?? "N/A")}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-family: ${FONT}; font-size: 14px; color: #374151;">Fecha</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-family: ${FONT}; font-size: 14px; color: #1F2937;">${new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" })}</td>
      </tr>
    </table>`

  const subject = `Pago ${label} - Pedido ${params.orderId} | ${STORE_NAME}`

  await sendEmail(
    {
      to: params.to,
      subject,
      html: emailWrapper(content, {
        preheader: `Pago ${label} por ${amount} — Pedido ${params.orderId}`,
      }),
      email_type: "payment-status",
      metadata: {
        orderId: params.orderId,
        transactionId: params.transactionId,
        wompiStatus: params.wompiStatus,
      },
    },
    params.auditService
  )
}
