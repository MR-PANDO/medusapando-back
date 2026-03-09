import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

export default async function orderEditCanceledHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; order_id: string }>) {
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
      template: "order-edit-canceled",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send order edit canceled email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order-edit.canceled",
}
