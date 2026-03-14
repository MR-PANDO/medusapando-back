import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import WishlistModuleService from "../../modules/wishlist/service"

export type AddWishlistItemInput = {
  wishlist_id: string
  product_variant_id: string
}

const validateWishlistExistsStep = createStep(
  "validate-wishlist-exists-for-add",
  async (input: AddWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    // Will throw if not found
    await wishlistService.retrieveWishlist(input.wishlist_id)

    return new StepResponse(true)
  }
)

const validateVariantNotInWishlistStep = createStep(
  "validate-variant-not-in-wishlist",
  async (input: AddWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const [existingItem] = await wishlistService.listWishlistItems({
      wishlist_id: input.wishlist_id,
      product_variant_id: input.product_variant_id,
    })

    if (existingItem) {
      throw new Error(
        `Variant ${input.product_variant_id} is already in the wishlist.`
      )
    }

    return new StepResponse(true)
  }
)

const addWishlistItemStep = createStep(
  "add-wishlist-item-step",
  async (input: AddWishlistItemInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const item = await wishlistService.createWishlistItems({
      wishlist_id: input.wishlist_id,
      product_variant_id: input.product_variant_id,
    })

    return new StepResponse(item, item.id)
  },
  async (id: string, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    await wishlistService.deleteWishlistItems(id)
  }
)

const refetchWishlistStep = createStep(
  "refetch-wishlist-after-add",
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

export const addWishlistItemWorkflow = createWorkflow(
  "add-wishlist-item",
  (input: AddWishlistItemInput) => {
    validateWishlistExistsStep(input)
    validateVariantNotInWishlistStep(input)
    addWishlistItemStep(input)

    const wishlist = refetchWishlistStep({
      wishlist_id: input.wishlist_id,
    })

    return new WorkflowResponse(wishlist)
  }
)
