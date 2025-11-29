import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type RecentlyPurchasedItem = {
  product_id: string
  variant_id: string | null
  product_title: string | null
  product_handle: string | null
  thumbnail: string | null
  last_purchased: Date | string
  purchase_count: number
  unit_price: number
}

// GET /store/customers/recently-purchased - Get products customer has purchased before
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  try {
    // Get authenticated customer from request
    const customerId = req.auth_context?.actor_id

    if (!customerId) {
      return res.json({
        recently_purchased: [],
        count: 0,
        message: "Customer not authenticated"
      })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Fetch customer's completed orders with line items
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "created_at",
        "status",
        "items.*",
      ],
      filters: {
        customer_id: customerId,
      },
    })

    // Extract unique products with purchase count
    const productMap = new Map<string, RecentlyPurchasedItem>()

    orders.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          if (item.product_id) {
            const key = item.product_id
            const existing = productMap.get(key)

            if (!existing || new Date(order.created_at) > new Date(existing.last_purchased)) {
              productMap.set(key, {
                product_id: item.product_id,
                variant_id: item.variant_id,
                product_title: item.product_title || item.title,
                product_handle: item.product_handle,
                thumbnail: item.thumbnail,
                last_purchased: order.created_at,
                purchase_count: (existing?.purchase_count || 0) + item.quantity,
                unit_price: item.unit_price,
              })
            } else if (existing) {
              existing.purchase_count += item.quantity
            }
          }
        })
      }
    })

    // Convert to array and sort by purchase count (most purchased first)
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 6

    const recentlyPurchased = Array.from(productMap.values())
      .sort((a, b) => b.purchase_count - a.purchase_count)
      .slice(0, limit)

    res.json({
      recently_purchased: recentlyPurchased,
      count: recentlyPurchased.length,
    })
  } catch (error) {
    console.error("Error fetching recently purchased products:", error)
    res.json({
      recently_purchased: [],
      count: 0,
      error: "Failed to fetch recently purchased products"
    })
  }
}
