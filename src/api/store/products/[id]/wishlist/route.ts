import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Get all variant IDs for this product
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id"],
      filters: { product_id: productId },
    })

    if (!variants || variants.length === 0) {
      return res.json({ count: 0 })
    }

    const variantIds = variants.map((v: any) => v.id)

    // Count wishlists containing any of these variants
    const { data: wishlistItems } = await query.graph({
      entity: "wishlist_item",
      fields: ["id", "wishlist_id"],
      filters: {
        product_variant_id: variantIds,
      },
    })

    // Get unique wishlist count
    const uniqueWishlistIds = new Set(
      (wishlistItems as any[]).map((item) => item.wishlist_id)
    )

    res.json({ count: uniqueWishlistIds.size })
  } catch (error: any) {
    console.error("Error fetching wishlist count for product:", error)
    res.json({ count: 0 })
  }
}
