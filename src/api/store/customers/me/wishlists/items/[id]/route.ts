import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { WISHLIST_MODULE } from "../../../../../../../modules/wishlist"
import WishlistModuleService from "../../../../../../../modules/wishlist/service"
import { removeWishlistItemWorkflow } from "../../../../../../../workflows/wishlist/remove-wishlist-item"

export const DELETE = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const itemId = req.params.id

  const salesChannelId =
    req.publishable_key_context?.sales_channel_ids?.[0] || null

  const wishlistService: WishlistModuleService =
    req.scope.resolve(WISHLIST_MODULE)

  // Find the customer's wishlist
  const [wishlist] = await wishlistService.listWishlists({
    customer_id: customerId,
    sales_channel_id: salesChannelId || undefined,
  })

  if (!wishlist) {
    return res.status(404).json({ message: "Wishlist not found" })
  }

  try {
    const { result: updatedWishlist } = await removeWishlistItemWorkflow(
      req.scope
    ).run({
      input: {
        wishlist_id: wishlist.id,
        item_id: itemId,
      },
    })

    res.json({ wishlist: updatedWishlist })
  } catch (error: any) {
    res.status(400).json({ message: error.message })
  }
}
