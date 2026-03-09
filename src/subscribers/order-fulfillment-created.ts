import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { notifyManager } from "../utils/notify-manager"

export default async function orderFulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  order_id: string
  fulfillment_id: string
  no_notification?: boolean
}>) {
  if (data.no_notification) return

  try {
    const orderService = container.resolve(Modules.ORDER) as any
    const order = await orderService.retrieveOrder(data.order_id, {
      relations: ["items", "shipping_address"],
    })

    if (!order?.email) return

    // Get fulfillment details if available
    let fulfillmentItems: any[] = []
    let hasReplacements = false
    let note: string | null = null

    if (data.fulfillment_id) {
      try {
        const fulfillmentService = container.resolve(Modules.FULFILLMENT) as any
        const fulfillment = await fulfillmentService.retrieveFulfillment(
          data.fulfillment_id,
          { relations: ["items"] }
        )
        // Check metadata for replacements and notes
        if (fulfillment.metadata?.replacements) {
          hasReplacements = true
        }
        if (fulfillment.metadata?.note) {
          note = fulfillment.metadata.note
        }
      } catch {
        // Fulfillment details not available — use order items
      }
    }

    // Check order metadata for replacements
    if (order.metadata?.has_replacements) {
      hasReplacements = true
    }
    if (order.metadata?.fulfillment_note) {
      note = order.metadata.fulfillment_note
    }

    // Build items list from order items
    const items = (order.items ?? []).map((item: any) => {
      const isReplacement = item.metadata?.is_replacement === true
      if (isReplacement) hasReplacements = true

      return {
        title: item.title,
        quantity: item.quantity,
        thumbnail: item.thumbnail,
        unit_price:
          typeof item.unit_price === "object"
            ? Number(item.unit_price.value ?? item.unit_price)
            : Number(item.unit_price ?? 0),
        is_replacement: isReplacement,
        original_title: item.metadata?.original_title ?? null,
      }
    })

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
      template: "order-fulfillment",
      data: {
        order_id: order.id,
        display_id: order.display_id,
        customer_name: customerName,
        items,
        has_replacements: hasReplacements,
        note,
      },
    })

    // Manager notification
    await notifyManager(container, {
      event_label: "Pedido preparado para envio",
      order_id: order.id,
      display_id: order.display_id,
      customer_name: customerName,
      customer_email: order.email,
      icon: "&#128230;",
      icon_bg: "#f0f7ec",
    })
  } catch (error) {
    console.error(
      "[Subscriber] Failed to send order fulfillment email:",
      error
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
