import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { updateReviewStatusWorkflow } from "../../../../workflows/product-review/update-review-status"
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review"
import ProductReviewModuleService from "../../../../modules/product-review/service"

type UpdateReviewStatusBody = {
  status: "approved" | "rejected"
}

export const POST = async (
  req: MedusaRequest<UpdateReviewStatusBody>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { status } = req.body

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({
      message: "Invalid status. Must be 'approved' or 'rejected'.",
    })
    return
  }

  const { result: review } = await updateReviewStatusWorkflow(
    req.scope
  ).run({
    input: { id, status },
  })

  // Directly update product metadata with review stats
  try {
    const reviewService: ProductReviewModuleService =
      req.scope.resolve(PRODUCT_REVIEW_MODULE)
    const productService = req.scope.resolve(Modules.PRODUCT) as any

    const fullReview = await reviewService.retrieveReview(id)
    if (fullReview?.product_id) {
      const ratingData = await reviewService.getAverageRating(fullReview.product_id)

      const product = await productService.retrieveProduct(fullReview.product_id)
      await productService.updateProducts(fullReview.product_id, {
        metadata: {
          ...(product.metadata || {}),
          review_count: ratingData.count,
          avg_rating: ratingData.average,
        },
      })
    }
  } catch (err: any) {
    console.error("[Reviews] Failed to update product metadata:", err.message)
  }

  res.json({ review })
}
