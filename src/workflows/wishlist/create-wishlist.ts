import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../../modules/wishlist"
import WishlistModuleService from "../../modules/wishlist/service"

export type CreateWishlistInput = {
  customer_id: string
  sales_channel_id?: string
}

const validateCustomerHasNoWishlistStep = createStep(
  "validate-customer-has-no-wishlist",
  async (input: CreateWishlistInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const [existingWishlists] = await wishlistService.listWishlists({
      customer_id: input.customer_id,
      sales_channel_id: input.sales_channel_id || undefined,
    })

    if (existingWishlists) {
      throw new Error(
        `Customer ${input.customer_id} already has a wishlist for this sales channel.`
      )
    }

    return new StepResponse(true)
  }
)

const createWishlistStep = createStep(
  "create-wishlist-step",
  async (input: CreateWishlistInput, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    const wishlist = await wishlistService.createWishlists({
      customer_id: input.customer_id,
      sales_channel_id: input.sales_channel_id || null,
    })

    return new StepResponse(wishlist, wishlist.id)
  },
  async (id: string, { container }) => {
    const wishlistService: WishlistModuleService =
      container.resolve(WISHLIST_MODULE)

    await wishlistService.deleteWishlists(id)
  }
)

export const createWishlistWorkflow = createWorkflow(
  "create-wishlist",
  (input: CreateWishlistInput) => {
    validateCustomerHasNoWishlistStep(input)
    const wishlist = createWishlistStep(input)
    return new WorkflowResponse(wishlist)
  }
)
