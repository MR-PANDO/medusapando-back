import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

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

    await notifyWithAudit(container, {
      to: order.email,
      channel: "email",
      template: "order-placed",
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
  } catch (error) {
    console.error("[Subscriber] Failed to send order placed email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
