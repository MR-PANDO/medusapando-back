import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import ProductReviewModuleService from "../../modules/product-review/service"

export type CreateReviewInput = {
  title?: string | null
  content: string
  rating: number
  first_name: string
  last_name: string
  product_id: string
  customer_id?: string | null
  ip_address?: string | null
  user_agent?: string | null
}

const validateProductStep = createStep(
  "validate-product-step",
  async (input: CreateReviewInput, { container }) => {
    const productService = container.resolve(Modules.PRODUCT)

    // This will throw if the product doesn't exist
    await productService.retrieveProduct(input.product_id)

    return new StepResponse(true)
  }
)

const createReviewStep = createStep(
  "create-review-step",
  async (input: CreateReviewInput, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    const review = await reviewService.createReviews(input)

    return new StepResponse(review, review.id)
  },
  async (id: string, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    await reviewService.deleteReviews(id)
  }
)

export const createReviewWorkflow = createWorkflow(
  "create-review",
  (input: CreateReviewInput) => {
    validateProductStep(input)

    const review = createReviewStep(input)

    return new WorkflowResponse(review)
  }
)
