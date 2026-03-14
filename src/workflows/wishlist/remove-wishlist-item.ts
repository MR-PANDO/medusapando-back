import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import WishlistModuleService from "../../modules/wishlist/service"

export type RemoveWishlistItemInput = {
  wishlist_id: string
  item_id: string
}

const validateWishlistExistsStep = createStep(
  "validate-wishlist-exists-for-remove",
  async (input: RemoveWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    // Will throw if not found
    await wishlistService.retrieveWishlist(input.wishlist_id)

    return new StepResponse(true)
  }
)

const validateItemInWishlistStep = createStep(
  "validate-item-in-wishlist",
  async (input: RemoveWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const item = await wishlistService.retrieveWishlistItem(input.item_id)

    if (item.wishlist_id !== input.wishlist_id) {
      throw new Error(
        `Item ${input.item_id} does not belong to wishlist ${input.wishlist_id}.`
      )
    }

    return new StepResponse(item)
  }
)

const removeWishlistItemStep = createStep(
  "remove-wishlist-item-step",
  async (input: RemoveWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const item = await wishlistService.retrieveWishlistItem(input.item_id)

    await wishlistService.deleteWishlistItems(input.item_id)

    return new StepResponse(true, {
      id: item.id,
      wishlist_id: item.wishlist_id,
      product_variant_id: item.product_variant_id,
    })
  },
  async (
    deletedItem: {
      id: string
      wishlist_id: string
      product_variant_id: string
    },
    { container }
  ) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    await wishlistService.createWishlistItems({
      wishlist_id: deletedItem.wishlist_id,
      product_variant_id: deletedItem.product_variant_id,
    })
  }
)

const refetchWishlistStep = createStep(
  "refetch-wishlist-after-remove",
  async (input: { wishlist_id: string }, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const wishlist = await wishlistService.retrieveWishlist(
      input.wishlist_id,
      { relations: ["items"] }
    )

    return new StepResponse(wishlist)
  }
)

export const removeWishlistItemWorkflow = createWorkflow(
  "remove-wishlist-item",
  (input: RemoveWishlistItemInput) => {
    validateWishlistExistsStep(input)
    validateItemInWishlistStep(input)
    removeWishlistItemStep(input)

    const wishlist = refetchWishlistStep({
      wishlist_id: input.wishlist_id,
    })

    return new WorkflowResponse(wishlist)
  }
)
