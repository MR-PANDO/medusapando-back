import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

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
      template: "order-shipped",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl,
        carrier: fulfillment.provider_id ?? null,
      },
    })

    // Manager notification
    await notifyManager(container, {
      event_label: "Pedido enviado",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      details: trackingNumber ? `Guia: ${trackingNumber}` : undefined,
      icon: "&#128666;",
      icon_bg: "#f0f7ec",
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send order shipped email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
