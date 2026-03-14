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

  // Enrich items with variant and product data via query
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const enrichedItems: any[] = []

  for (const item of wishlist.items || []) {
    try {
      const { data: [variant] } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "title",
          "sku",
          "calculated_price.*",
          "product.*",
          "product.thumbnail",
          "product.handle",
          "product.title",
          "product.status",
        ],
        filters: { id: item.product_variant_id },
        context: {
          currency_code:
            req.pricingContext?.currency_code ||
            req.query.currency_code as string ||
            "cop",
        },
      })

      enrichedItems.push({
        id: item.id,
        product_variant_id: item.product_variant_id,
        variant: variant || null,
      })
    } catch {
      enrichedItems.push({
        id: item.id,
        product_variant_id: item.product_variant_id,
        variant: null,
      })
    }
  }

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
