import { sendEmail } from "./email-sender"
import { lowInventoryTemplate } from "../modules/smtp-notification/templates/low-inventory"
import type EmailAuditModuleService from "../modules/email-audit/service"

type LowStockItem = {
  sku: string
  product_title: string
  variant_title: string
  quantity: number
  threshold: number
}

/**
 * Send a low-inventory notification email after a Nubex sync.
 * Uses sendEmail() with audit logging.
 */
export async function sendLowStockNotification(params: {
  to: string
  items: LowStockItem[]
  threshold: number
  auditService?: EmailAuditModuleService
}) {
  const { to, items, threshold, auditService } = params

  if (items.length === 0) return

  const syncDate = new Date().toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })

  const html = lowInventoryTemplate({
    items,
    threshold,
    sync_date: syncDate,
  })

  const zeroCount = items.filter((i) => i.quantity === 0).length
  const lowCount = items.length - zeroCount

  const subjectParts: string[] = []
  if (zeroCount > 0) subjectParts.push(`${zeroCount} sin stock`)
  if (lowCount > 0) subjectParts.push(`${lowCount} con stock bajo`)

  const subject = `Alerta de inventario: ${subjectParts.join(", ")}`

  await sendEmail(
    {
      to,
      subject,
      html,
      email_type: "low-inventory",
      metadata: {
        total_items: items.length,
        zero_stock: zeroCount,
        low_stock: lowCount,
        threshold,
      },
    },
    auditService
  )
}
