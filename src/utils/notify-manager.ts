import { notifyWithAudit } from "./notify-with-audit"
import { EMAIL_AUDIT_MODULE } from "../modules/email-audit"
import type EmailAuditModuleService from "../modules/email-audit/service"

type ManagerAlertParams = {
  event_label: string
  order_id: string
  display_id: string | number
  customer_name?: string
  customer_email?: string
  details?: string
  icon?: string
  icon_bg?: string
}

/**
 * Send a manager notification for an order-related event.
 * Uses the `manager-order-alert` template and sends to the manager_email
 * configured in SMTP settings (admin dashboard).
 * Silently skips if no manager email is configured.
 */
export async function notifyManager(
  container: any,
  params: ManagerAlertParams
) {
  let managerEmail: string | null = null

  try {
    const auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
    managerEmail = await auditService.getManagerEmail()
  } catch {
    // email-audit module not available
  }

  if (!managerEmail) return

  await notifyWithAudit(container, {
    to: managerEmail,
    channel: "email",
    template: "manager-order-alert",
    data: params,
  })
}
