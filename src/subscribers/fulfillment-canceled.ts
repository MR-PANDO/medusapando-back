import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

export default async function fulfillmentCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string; fulfillment_id: string }>) {
  try {
    const orderService = container.resolve(Modules.ORDER) as any
    const order = await orderService.retrieveOrder(data.order_id, {
      relations: ["shipping_address"],
    })

    if (!order?.email) return

    const customerName = order.shipping_address
      ? [order.shipping_address.first_name, order.shipping_address.last_name]
          .filter(Boolean)
          .join(" ")
      : ""

    // Customer email
    await notifyWithAudit(container, {
      to: order.email,
      channel: "email",
      template: "fulfillment-canceled",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
      },
    })

    // Manager email
    await notifyManager(container, {
      event_label: "Envio cancelado",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      icon: "&#128666;",
      icon_bg: "#FEE2E2",
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send fulfillment canceled email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_canceled",
}
