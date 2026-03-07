import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { validateWompiSignature } from "../../../../utils/wompi-signature"
import { WOMPI_MODULE } from "../../../../modules/wompi"
import type WompiModuleService from "../../../../modules/wompi/service"
import { WOMPI_ORDER_STATUSES } from "../../../../modules/wompi/types"
import { sendPaymentStatusEmail } from "../../../../utils/wompi-email"
import { EMAIL_AUDIT_MODULE } from "../../../../modules/email-audit"
import type EmailAuditModuleService from "../../../../modules/email-audit/service"

// Public endpoint — Wompi sends webhooks without auth tokens
export const AUTHENTICATE = false

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const body = req.body as any

  // 1. Validate payload structure before processing
  if (
    !body?.signature?.properties ||
    !body?.signature?.checksum ||
    typeof body?.timestamp !== "number" ||
    !body?.data
  ) {
    // Return 200 to prevent Wompi from retrying with bad payloads
    return res.status(200).json({ received: true })
  }

  // 2. Validate webhook signature (timing-safe)
  const eventsSecret = process.env.WOMPI_EVENTS_SECRET
  if (!eventsSecret) {
    console.error("[Wompi Webhook] WOMPI_EVENTS_SECRET not configured")
    return res.status(500).json({ error: "Server configuration error" })
  }

  const isValid = validateWompiSignature(
    {
      data: body.data,
      signature: body.signature,
      timestamp: body.timestamp,
    },
    eventsSecret
  )

  if (!isValid) {
    console.warn("[Wompi Webhook] Invalid signature rejected")
    return res.status(401).json({ error: "Invalid signature" })
  }

  // 3. Only handle transaction.updated events
  if (body.event !== "transaction.updated") {
    return res.status(200).json({ received: true })
  }

  const transaction = body.data?.transaction
  if (!transaction?.id || !transaction?.status) {
    return res.status(200).json({ received: true })
  }

  const {
    id: transactionId,
    status: wompiStatus,
    reference: orderId,
    payment_link_id: paymentLinkId,
    payment_method_type: paymentMethodType,
    customer_email: customerEmail,
    amount_in_cents: amountInCents,
  } = transaction

  // Extract additional transaction details
  const paymentMethod = transaction.payment_method ?? {}
  const paymentMethodDetail =
    paymentMethod.extra?.last_four
      ? `${paymentMethod.extra?.brand ?? paymentMethodType} •••• ${paymentMethod.extra?.last_four}`
      : paymentMethod.phone_number
        ? `${paymentMethodType} ${paymentMethod.phone_number}`
        : paymentMethodType ?? null
  const customerName =
    transaction.customer_data?.full_name ??
    transaction.shipping_address?.address_line_1 ??
    null
  const customerPhone =
    transaction.customer_data?.phone_number ??
    paymentMethod.phone_number ??
    null
  const wompiReference = transaction.reference ?? null

  // 4. Update WompiPayment record (idempotent)
  const wompiService = req.scope.resolve<WompiModuleService>(WOMPI_MODULE)

  let updatedRecord: any = null
  if (paymentLinkId) {
    // Check for duplicate processing (idempotency)
    const existing = await wompiService.findByPaymentLinkId(paymentLinkId)
    if (
      existing?.wompi_transaction_id === transactionId &&
      existing?.wompi_status ===
        { APPROVED: "approved", DECLINED: "declined", VOIDED: "voided", ERROR: "error" }[wompiStatus]
    ) {
      // Already processed this exact update
      return res.status(200).json({ received: true })
    }

    updatedRecord = await wompiService.updateFromWebhook(
      paymentLinkId,
      transactionId,
      wompiStatus,
      paymentMethodType ?? null,
      body,
      {
        paymentMethodDetail,
        customerName,
        customerPhone,
        wompiReference,
        customerEmail: customerEmail ?? null,
      }
    )
  }

  // 5. Update Medusa order metadata
  const finalStatuses = ["APPROVED", "DECLINED", "VOIDED", "ERROR"]
  if (orderId && finalStatuses.includes(wompiStatus)) {
    const wompiStatusToOrder: Record<string, string> = {
      APPROVED: WOMPI_ORDER_STATUSES.PAYMENT_APPROVED,
      DECLINED: WOMPI_ORDER_STATUSES.PAYMENT_DECLINED,
      VOIDED: WOMPI_ORDER_STATUSES.PAYMENT_VOIDED,
      ERROR: WOMPI_ORDER_STATUSES.PAYMENT_ERROR,
    }

    try {
      const orderService = req.scope.resolve(Modules.ORDER)
      await (orderService as any).updateOrders([
        {
          id: orderId,
          metadata: {
            wompi_status: wompiStatusToOrder[wompiStatus],
            wompi_transaction_id: transactionId,
            wompi_finalized_at: new Date().toISOString(),
          },
        },
      ])
    } catch (err) {
      console.error("[Wompi Webhook] Failed to update order:", err)
    }
  }

  // 6. Send email notification
  if (finalStatuses.includes(wompiStatus)) {
    try {
      const settings = await wompiService.getSettings()
      if (
        settings.emailNotificationsEnabled &&
        settings.paymentManagerEmail
      ) {
        let emailAuditService: EmailAuditModuleService | undefined
        try {
          emailAuditService = req.scope.resolve<EmailAuditModuleService>(EMAIL_AUDIT_MODULE)
        } catch {}

        await sendPaymentStatusEmail({
          to: settings.paymentManagerEmail,
          orderId: orderId ?? "unknown",
          transactionId,
          wompiStatus,
          amountInCents: amountInCents ?? 0,
          customerEmail: customerEmail ?? undefined,
          paymentMethodType: paymentMethodType ?? undefined,
          auditService: emailAuditService,
        })
      }
    } catch (err) {
      console.error("[Wompi Webhook] Failed to send email:", err)
    }
  }

  return res.status(200).json({ received: true })
}
