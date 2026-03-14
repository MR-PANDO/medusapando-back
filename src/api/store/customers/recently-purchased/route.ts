import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * GET /store/customers/recently-purchased?limit=6
 * Returns distinct products the customer has purchased, sorted by most recent.
 * Requires authenticated customer.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const limit = Math.min(Number(req.query.limit) || 6, 20)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any

  try {
    // Get customer's completed orders with items
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "created_at",
        "items.id",
        "items.product_id",
        "items.variant_id",
        "items.product_title",
        "items.product_handle",
        "items.thumbnail",
        "items.unit_price",
      ],
      filters: {
        customer_id: customerId,
      },
      pagination: {
        order: { created_at: "DESC" },
        take: 50,
      },
    })

    // Build a map of product_id → most recent purchase info
    const productMap = new Map<string, {
      product_id: string
      variant_id: string | null
      product_title: string | null
      product_handle: string | null
      thumbnail: string | null
      last_purchased: string
      purchase_count: number
      unit_price: number
    }>()

    for (const order of orders) {
      for (const item of (order.items || [])) {
        if (!item.product_id) continue

        const existing = productMap.get(item.product_id)
        if (existing) {
          existing.purchase_count++
          // Keep the most recent purchase date
          if (order.created_at > existing.last_purchased) {
            existing.last_purchased = order.created_at
            existing.unit_price = item.unit_price || 0
            existing.variant_id = item.variant_id || null
            existing.thumbnail = item.thumbnail || existing.thumbnail
          }
        } else {
          productMap.set(item.product_id, {
            product_id: item.product_id,
            variant_id: item.variant_id || null,
            product_title: item.product_title || null,
            product_handle: item.product_handle || null,
            thumbnail: item.thumbnail || null,
            last_purchased: order.created_at,
            purchase_count: 1,
            unit_price: item.unit_price || 0,
          })
        }
      }
    }

    // Sort by most recent purchase, take limit
    const recently_purchased = [...productMap.values()]
      .sort((a, b) => new Date(b.last_purchased).getTime() - new Date(a.last_purchased).getTime())
      .slice(0, limit)

    res.json({
      recently_purchased,
      count: recently_purchased.length,
    })
  } catch (err: any) {
    console.error("[RecentlyPurchased] Error:", err.message)
    res.json({ recently_purchased: [], count: 0 })
  }
}
