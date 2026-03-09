import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

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

    const customerName = order.shipping_address
      ? [
          order.shipping_address.first_name,
          order.shipping_address.last_name,
        ]
          .filter(Boolean)
          .join(" ")
      : ""

    await notifyWithAudit(container, {
      to: order.email,
      channel: "email",
      template: "payment-captured",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
        amount: total,
        currency_code: order.currency_code,
      },
    })

    // Manager notification
    await notifyManager(container, {
      event_label: "Pago capturado",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      icon: "&#128176;",
      icon_bg: "#f0f7ec",
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send payment captured email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
}
