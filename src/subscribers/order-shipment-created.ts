import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

export default async function orderShipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  id: string
  no_notification?: boolean
}>) {
  if (data.no_notification) return

  try {
    const fulfillmentService = container.resolve(Modules.FULFILLMENT) as any
    const fulfillment = await fulfillmentService.retrieveFulfillment(data.id, {
      relations: ["labels"],
    })

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

    const trackingNumber =
      fulfillment.tracking_numbers?.[0] ??
      fulfillment.labels?.[0]?.tracking_number ??
      null
    const trackingUrl =
      fulfillment.tracking_links?.[0]?.url ??
      fulfillment.labels?.[0]?.tracking_url ??
      null

    await notifyWithAudit(container, {
      to: order.email,
      channel: "email",
      template: "order-shipped",
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
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: fulfillment.provider_id ?? null,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send order shipped email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
