import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

export default async function paymentCapturedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    // 1. Retrieve the payment to get payment_collection_id
    const paymentService = container.resolve(Modules.PAYMENT) as any
    const payment = await paymentService.retrievePayment(data.id)

    if (!payment?.payment_collection_id) return

    // 2. Find the order via payment collection link (same approach as capturePaymentWorkflow)
    const remoteQuery = container.resolve(ContainerRegistrationKeys.REMOTE_QUERY) as any
    const [orderPayment] = await remoteQuery({
      entry_point: "order_payment_collection",
      fields: ["order.id", "order.display_id", "order.email", "order.currency_code",
               "order.total", "order.shipping_address.*"],
      variables: { payment_collection_id: payment.payment_collection_id },
    })

    const order = orderPayment?.order
    if (!order?.email) return

    const rawTotal = order.total ?? 0
    const total =
      typeof rawTotal === "object"
        ? Number(rawTotal.value ?? rawTotal.numeric ?? rawTotal)
        : Number(rawTotal)

    await notifyWithAudit(container, {
      to: order.email,
      channel: "email",
      template: "payment-captured",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: order.shipping_address
          ? [
              order.shipping_address.first_name,
              order.shipping_address.last_name,
            ]
              .filter(Boolean)
              .join(" ")
          : "",
        amount: total,
        currency_code: order.currency_code,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send payment captured email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
