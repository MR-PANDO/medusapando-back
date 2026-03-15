import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import ProductReviewModuleService from "../../modules/product-review/service"

export type UpdateReviewStatusInput = {
  id: string
  status: "approved" | "rejected"
}

const updateReviewStatusStep = createStep(
  "update-review-status-step",
  async (input: UpdateReviewStatusInput, { container }) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    // Retrieve old review for compensation
    const oldReview = await reviewService.retrieveReview(input.id)
    const previousStatus = oldReview.status

    const review = await reviewService.updateReviews({
      id: input.id,
      status: input.status,
    })

    return new StepResponse(review, {
      id: input.id,
      previousStatus,
    })
  },
  async (
    compensationData: { id: string; previousStatus: string },
    { container }
  ) => {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)

    await reviewService.updateReviews({
      id: compensationData.id,
      status: compensationData.previousStatus as "pending" | "approved" | "rejected",
    })
  }
)

export const updateReviewStatusWorkflow = createWorkflow(
  "update-review-status",
  (input: UpdateReviewStatusInput) => {
    const review = updateReviewStatusStep(input)

    return new WorkflowResponse(review)
  }
)
