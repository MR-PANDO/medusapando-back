import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import ProductReviewModuleService from "../modules/product-review/service"

/**
 * When a review status changes (approved/rejected), update the product's
 * metadata with review_count and avg_rating so products can be sorted
 * by reviews in the store.
 */
export default async function reviewStatusChangedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const reviewService: ProductReviewModuleService =
      container.resolve(PRODUCT_REVIEW_MODULE)
    const productService = container.resolve(Modules.PRODUCT) as any

    // Get the review to find the product_id
    const review = await reviewService.retrieveReview(event.data.id)
    if (!review?.product_id) return

    // Get average rating and count for this product
    const avgRating = await reviewService.getAverageRating(review.product_id)

    const [approvedReviews] = await reviewService.listAndCountReviews(
      { product_id: review.product_id, status: "approved" as any },
      { take: 0 }
    )

    const reviewCount = approvedReviews as unknown as number

    // Update product metadata
    const product = await productService.retrieveProduct(review.product_id)
    await productService.updateProducts(review.product_id, {
      metadata: {
        ...(product.metadata || {}),
        review_count: reviewCount,
        avg_rating: avgRating,
      },
    })

    console.log(
      `[Reviews] Updated product ${review.product_id} metadata: ${reviewCount} reviews, ${avgRating} avg rating`
    )
  } catch (err: any) {
    console.error("[Reviews] Failed to update product metadata:", err.message)
  }
}

export const config: SubscriberConfig = {
  event: "product_review.updated",
}
