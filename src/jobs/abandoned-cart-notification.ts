import { MedusaContainer } from "@medusajs/framework/types"
import { sendAbandonedCartsWorkflow } from "../workflows/send-abandoned-carts"

export default async function abandonedCartNotificationJob(
  container: MedusaContainer
) {
  const query = container.resolve("query")

  const twentyFourHoursAgo = new Date()
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

  try {
    // Fetch carts with items that were updated more than 24h ago
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "metadata",
        "updated_at",
        "completed_at",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
      ],
      filters: {
        completed_at: null, // Not completed (not turned into an order)
      },
    })

    // Filter carts: has email, has items, updated >24h ago, not already notified
    const abandonedCarts = (carts as any[]).filter((cart) => {
      if (!cart.email) return false
      if (!cart.items || cart.items.length === 0) return false
      if (new Date(cart.updated_at) > twentyFourHoursAgo) return false
      if (cart.metadata?.abandoned_notified_at) return false
      return true
    })

    if (abandonedCarts.length === 0) {
      console.log("[Abandoned Cart Job] No abandoned carts found.")
      return
    }

    console.log(
      `[Abandoned Cart Job] Found ${abandonedCarts.length} abandoned cart(s). Sending notifications...`
    )

    const cartsPayload = abandonedCarts.map((cart) => ({
      id: cart.id,
      email: cart.email,
      items: cart.items.map((item: any) => ({
        title: item.variant?.product?.title || item.title,
        quantity: item.quantity,
        thumbnail: item.variant?.product?.thumbnail || item.thumbnail,
        variant_title: item.variant?.title,
        unit_price: item.unit_price,
      })),
      customer_name:
        cart.shipping_address?.first_name || undefined,
    }))

    await sendAbandonedCartsWorkflow(container).run({
      input: { carts: cartsPayload },
    })

    console.log(
      `[Abandoned Cart Job] Successfully processed ${abandonedCarts.length} abandoned cart(s).`
    )
  } catch (error) {
    console.error("[Abandoned Cart Job] Error:", error)
  }
}

export const config = {
  name: "abandoned-cart-notification",
  schedule: "0 0 * * *", // Every day at midnight
}
