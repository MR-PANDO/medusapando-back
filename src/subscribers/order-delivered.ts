import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

export default async function orderDeliveredHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT) as any
    const fulfillment = await fulfillmentService.retrieveFulfillment(data.id)

    // Find the order linked to this fulfillment (same pattern as order-shipment-created)
    const orderService = container.resolve(Modules.ORDER) as any

    let order: any = null
    try {
      const orders = await orderService.listOrders(
        { id: fulfillment.order_id },
        { relations: ["shipping_address"] }
      )
      order = orders?.[0]
    } catch {
      return
    }

    if (!order?.email) return

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
      template: "order-delivered",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
      },
    })

    // Manager notification
    await notifyManager(container, {
      event_label: "Pedido entregado",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      icon: "&#127968;",
      icon_bg: "#f0f7ec",
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send order delivered email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
