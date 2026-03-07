import { Modules } from "@medusajs/framework/utils"
import { EMAIL_AUDIT_MODULE } from "../modules/email-audit"
import type EmailAuditModuleService from "../modules/email-audit/service"

type NotifyParams = {
  to: string
  channel: string
  template: string
  data: Record<string, any>
  subject?: string
}

/**
 * Send a notification via Medusa's notification module and log it to email audit.
 * Use this in subscribers instead of calling notificationService.createNotifications() directly.
 */
export async function notifyWithAudit(
  container: any,
  params: NotifyParams
) {
  const notificationService = container.resolve(Modules.NOTIFICATION) as any

  let auditService: EmailAuditModuleService | null = null
  try {
    auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
  } catch {
    // emailAudit module not available — send without audit
  }

  // Get "from" from DB settings if available
  let smtpFrom = process.env.SMTP_FROM || ""
  if (auditService) {
    try {
      const dbSettings = await auditService.getSmtpSettings()
      if (dbSettings?.from) smtpFrom = dbSettings.from
    } catch {}
  }

  let auditId: string | null = null
  if (auditService) {
    try {
      const record = await auditService.logEmail({
        to: params.to,
        from: smtpFrom,
        subject: params.subject || params.template,
        email_type: params.template,
        status: "queued",
        metadata: params.data,
      })
      auditId = record.id
    } catch (err) {
      console.error("[EmailAudit] Failed to log queued notification:", err)
    }
  }

  try {
    await notificationService.createNotifications({
      to: params.to,
      channel: params.channel,
      template: params.template,
      data: params.data,
    })

    if (auditService && auditId) {
      try {
        await auditService.markSent(auditId)
      } catch (err) {
        console.error("[EmailAudit] Failed to mark notification as sent:", err)
      }
    }
  } catch (error: any) {
    if (auditService && auditId) {
      try {
        await auditService.markFailed(auditId, error.message ?? String(error))
      } catch (err) {
        console.error("[EmailAudit] Failed to mark notification as failed:", err)
      }
    }
    throw error
  }
}
