import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

export default async function orderEditRequestedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; actions: any[] }>) {
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
      template: "order-edit-requested",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
      },
    })

    // Manager email
    await notifyManager(container, {
      event_label: "Modificacion de pedido solicitada",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      icon: "&#9998;",
      icon_bg: "#FEF3C7",
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send order edit requested email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order-edit.requested",
}
