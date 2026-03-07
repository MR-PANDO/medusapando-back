import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import nodemailer, { type Transporter } from "nodemailer"
import {
  abandonedCartTemplate,
  getAbandonedCartSubject,
} from "./templates/abandoned-cart"
import type EmailAuditModuleService from "../../modules/email-audit/service"
import { EMAIL_AUDIT_MODULE } from "../../modules/email-audit"

type SmtpOptions = {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
  storefront_url: string
}

type SendNotificationInput = {
  to: string
  channel: string
  template: string
  data: Record<string, unknown>
}

type ProviderSendNotificationResultsDTO = {
  id: string
}

class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp"

  private transporter: Transporter
  private from: string
  private storefrontUrl: string
  private container: Record<string, unknown>

  constructor(container: Record<string, unknown>, options: SmtpOptions) {
    super()

    this.container = container
    this.from = options.from
    this.storefrontUrl = options.storefront_url

    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: {
        user: options.auth.user,
        pass: options.auth.pass,
      },
    })
  }

  private getAuditService(): EmailAuditModuleService | null {
    try {
      return (this.container as any).resolve
        ? (this.container as any).resolve(EMAIL_AUDIT_MODULE)
        : null
    } catch {
      return null
    }
  }

  async send(
    notification: SendNotificationInput
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, template, data } = notification

    let subject: string
    let html: string

    switch (template) {
      case "abandoned-cart":
        subject = getAbandonedCartSubject(
          (data.reminder_number as number) || 1
        )
        html = abandonedCartTemplate({
          ...data,
          storefront_url: this.storefrontUrl,
        })
        break
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unknown email template: ${template}`
        )
    }

    // Log as queued (best-effort)
    const auditService = this.getAuditService()
    let auditId: string | null = null
    if (auditService) {
      try {
        const record = await auditService.logEmail({
          to,
          from: this.from,
          subject,
          email_type: template,
          status: "queued",
          metadata: data as Record<string, any>,
        })
        auditId = record.id
      } catch (err) {
        console.error("[EmailAudit] Failed to log queued notification:", err)
      }
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      })

      // Mark as sent
      if (auditService && auditId) {
        try {
          await auditService.markSent(auditId)
        } catch (err) {
          console.error("[EmailAudit] Failed to mark notification as sent:", err)
        }
      }

      return { id: info.messageId }
    } catch (error: any) {
      // Mark as failed
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
}

export default SmtpNotificationService
