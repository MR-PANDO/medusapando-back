import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import ProductReviewModuleService from "../../../modules/product-review/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { status, product_id, limit, offset } = req.query as Record<
    string,
    string | undefined
  >

  const filters: Record<string, any> = {}
  if (status) filters.status = status
  if (product_id) filters.product_id = product_id

  const take = limit ? Number(limit) : 50
  const skip = offset ? Number(offset) : 0

  const reviewService =
    req.scope.resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)

  const [reviews, count] = await reviewService.listAndCountReviews(filters, {
    order: { created_at: "DESC" },
    take,
    skip,
  })

  res.json({ reviews, count, limit: take, offset: skip })
}
