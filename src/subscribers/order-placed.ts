import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const orderService = container.resolve(Modules.ORDER) as any
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items", "shipping_address", "summary"],
    })

    if (!order?.email) return

    const rawTotal = order.total ?? order.summary?.current_order_total ?? 0
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
      template: "order-placed",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
        email: order.email,
        total,
        currency_code: order.currency_code,
        items: (order.items ?? []).map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          thumbnail: item.thumbnail,
          unit_price:
            typeof item.unit_price === "object"
              ? Number(item.unit_price.value ?? item.unit_price)
              : Number(item.unit_price ?? 0),
        })),
        shipping_address: order.shipping_address
          ? {
              address_1: order.shipping_address.address_1,
              city: order.shipping_address.city,
              province: order.shipping_address.province,
            }
          : undefined,
      },
    })

    // Manager notification
    await notifyManager(container, {
      event_label: "Nuevo pedido recibido",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      icon: "&#128722;",
      icon_bg: "#f0f7ec",
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send order placed email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
