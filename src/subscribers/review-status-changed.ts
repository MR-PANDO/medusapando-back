import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import ProductReviewModuleService from "../modules/product-review/service"

/**
 * When a review status changes (approved/rejected), update the product's
 * metadata with review_count and avg_rating so products can be sorted
 * by reviews in the store and stars show on product cards.
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

    // Get average rating and count for approved reviews
    const ratingData = await reviewService.getAverageRating(review.product_id)

    // Update product metadata
    const product = await productService.retrieveProduct(review.product_id)
    await productService.updateProducts(review.product_id, {
      metadata: {
        ...(product.metadata || {}),
        review_count: ratingData.count,
        avg_rating: ratingData.average,
      },
    })

    console.log(
      `[Reviews] Updated product ${review.product_id}: ${ratingData.count} reviews, ${ratingData.average} avg rating`
    )
  } catch (err: any) {
    console.error("[Reviews] Failed to update product metadata:", err.message)
  }
}

export const config: SubscriberConfig = {
  event: "product_review.updated",
}
