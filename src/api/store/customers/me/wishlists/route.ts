import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../modules/wishlist/service"
import { createWishlistWorkflow } from "../../../../../workflows/wishlist/create-wishlist"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const salesChannelId =
    req.publishable_key_context?.sales_channel_ids?.[0] || null

  const wishlistService: WishlistModuleService =
    req.scope.resolve(WISHLIST_MODULE)

  // Try to find existing wishlist
  let [wishlist] = await wishlistService.listWishlists(
    {
      customer_id: customerId,
      sales_channel_id: salesChannelId || undefined,
    },
    { relations: ["items"] }
  )

  // Auto-create if it doesn't exist
  if (!wishlist) {
    const { result } = await createWishlistWorkflow(req.scope).run({
      input: {
        customer_id: customerId,
        sales_channel_id: salesChannelId || undefined,
      },
    })

    wishlist = await wishlistService.retrieveWishlist(result.id, {
      relations: ["items"],
    })
  }

  // Collect all variant IDs to fetch in one query
  const variantIds = (wishlist.items || [])
    .map((item: any) => item.product_variant_id)
    .filter(Boolean)

  // Fetch all variants with product data in a single query
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any
  const variantMap = new Map<string, any>()

  if (variantIds.length > 0) {
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "title",
          "sku",
          "product.id",
          "product.title",
          "product.handle",
          "product.thumbnail",
          "product.status",
        ],
        filters: { id: variantIds },
      })

      for (const v of variants) {
        variantMap.set(v.id, v)
      }
    } catch (err: any) {
      console.error("[Wishlist] Error fetching variants:", err.message)
    }
  }

  // Build enriched items
  const enrichedItems = (wishlist.items || []).map((item: any) => {
    const variant = variantMap.get(item.product_variant_id) || null
    return {
      id: item.id,
      product_variant_id: item.product_variant_id,
      variant: variant
        ? {
            id: variant.id,
            title: variant.title,
            sku: variant.sku,
            product: variant.product || null,
          }
        : null,
    }
  })

  res.json({
    wishlist: {
      id: wishlist.id,
      customer_id: wishlist.customer_id,
      sales_channel_id: wishlist.sales_channel_id,
      items: enrichedItems,
    },
  })
}

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const salesChannelId =
    req.publishable_key_context?.sales_channel_ids?.[0] || null

  try {
    const { result: wishlist } = await createWishlistWorkflow(req.scope).run({
      input: {
        customer_id: customerId,
        sales_channel_id: salesChannelId || undefined,
      },
    })

    res.status(201).json({ wishlist })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
