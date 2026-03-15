import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review"
import ProductReviewModuleService from "../../../../../modules/product-review/service"

export const AUTHENTICATE = false

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id

  const limit = Number(req.query.limit) || 10
  const offset = Number(req.query.offset) || 0

  const reviewService =
    req.scope.resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)

  const [reviews, count] = await reviewService.listAndCountReviews(
    {
      product_id: productId,
      status: "approved",
    },
    {
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    }
  )

  const ratingData = await reviewService.getAverageRating(productId)

  res.json({
    reviews,
    count,
    average_rating: ratingData.average,
    rating_count: ratingData.count,
    limit,
    offset,
  })
}
