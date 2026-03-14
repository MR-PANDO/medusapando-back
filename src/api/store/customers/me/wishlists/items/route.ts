import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../../modules/wishlist/service"
import { addWishlistItemWorkflow } from "../../../../../../workflows/wishlist/add-wishlist-item"
import { createWishlistWorkflow } from "../../../../../../workflows/wishlist/create-wishlist"
import { z } from "zod"
import { PostStoreWishlistItem } from "./validators"

type PostBody = z.infer<typeof PostStoreWishlistItem>

export const POST = async (
  req: AuthenticatedMedusaRequest<PostBody>,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { variant_id } = req.validatedBody as PostBody

  const salesChannelId =
    req.publishable_key_context?.sales_channel_ids?.[0] || null

  const wishlistService: WishlistModuleService =
    req.scope.resolve(WISHLIST_MODULE)

  // Find or auto-create wishlist
  let [wishlist] = await wishlistService.listWishlists({
    customer_id: customerId,
    sales_channel_id: salesChannelId || undefined,
  })

  if (!wishlist) {
    const { result } = await createWishlistWorkflow(req.scope).run({
      input: {
        customer_id: customerId,
        sales_channel_id: salesChannelId || undefined,
      },
    })
    wishlist = result
  }

  try {
    const { result: updatedWishlist } = await addWishlistItemWorkflow(
      req.scope
    ).run({
      input: {
        wishlist_id: wishlist.id,
        product_variant_id: variant_id,
      },
    })

    res.status(201).json({ wishlist: updatedWishlist })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
