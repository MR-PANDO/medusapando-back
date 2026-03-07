import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"
import { EMAIL_AUDIT_MODULE } from "../../modules/email-audit"
import type EmailAuditModuleService from "../../modules/email-audit/service"

type AbandonedCartItem = {
  title?: string
  quantity?: number
  thumbnail?: string
  variant_title?: string
  unit_price?: number
}

export type SendAbandonedNotificationsInput = {
  carts: Array<{
    id: string
    email: string
    items: AbandonedCartItem[]
    customer_name?: string
    reminder_number: number
  }>
}

export const sendAbandonedNotificationsStep = createStep(
  "send-abandoned-notifications",
  async (input: SendAbandonedNotificationsInput, { container }) => {
    const notificationService: INotificationModuleService = container.resolve(
      Modules.NOTIFICATION
    )

    let emailAuditService: EmailAuditModuleService | undefined
    try {
      emailAuditService = container.resolve<EmailAuditModuleService>(EMAIL_AUDIT_MODULE)
    } catch {}

    const sentCartIds: string[] = []

    for (const cart of input.carts) {
      try {
        await notificationService.createNotifications({
          to: cart.email,
          channel: "email",
          template: "abandoned-cart",
          data: {
            cart_id: cart.id,
            items: cart.items,
            customer_name: cart.customer_name,
            reminder_number: cart.reminder_number,
          },
        })
        sentCartIds.push(cart.id)

        // Log to email audit (best-effort)
        if (emailAuditService) {
          try {
            await emailAuditService.logEmail({
              to: cart.email,
              from: process.env.SMTP_FROM ?? "",
              subject: `Carrito abandonado - Recordatorio #${cart.reminder_number}`,
              email_type: "abandoned-cart",
              status: "sent",
              sent_at: new Date(),
              metadata: { cart_id: cart.id, reminder_number: cart.reminder_number },
            })
          } catch (err) {
            console.error("[EmailAudit] Failed to log abandoned cart email:", err)
          }
        }
      } catch (error) {
        // Log failed email to audit
        if (emailAuditService) {
          try {
            await emailAuditService.logEmail({
              to: cart.email,
              from: process.env.SMTP_FROM ?? "",
              subject: `Carrito abandonado - Recordatorio #${cart.reminder_number}`,
              email_type: "abandoned-cart",
              status: "failed",
              error: error instanceof Error ? error.message : String(error),
              metadata: { cart_id: cart.id, reminder_number: cart.reminder_number },
            })
          } catch {}
        }
        console.error(
          `Failed to send abandoned cart email #${cart.reminder_number} for cart ${cart.id}:`,
          error
        )
      }
    }

    return new StepResponse(sentCartIds, sentCartIds)
  }
)
