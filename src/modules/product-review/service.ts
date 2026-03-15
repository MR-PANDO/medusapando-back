import { MedusaService } from "@medusajs/framework/utils"
import { Review } from "./models/review"

class ProductReviewModuleService extends MedusaService({
  Review,
}) {
  async getAverageRating(
    productId: string
  ): Promise<{ average: number; count: number }> {
    const knex = (this as any).__container__["__pg_connection__"]

    const result = await knex.raw(
      `SELECT
        COALESCE(AVG(rating), 0) as average,
        COUNT(*)::int as count
      FROM product_review
      WHERE product_id = ?
        AND status = 'approved'
        AND deleted_at IS NULL`,
      [productId]
    )

    const row = result.rows?.[0] || result[0]
    return {
      average: parseFloat(Number(row?.average || 0).toFixed(2)),
      count: Number(row?.count || 0),
    }
  }

  async checkSpam(
    ip: string,
    productId: string
  ): Promise<{ isSpam: boolean; reason?: string }> {
    const knex = (this as any).__container__["__pg_connection__"]

    // Check 1: Same IP + same product > 3 reviews
    const productReviews = await knex.raw(
      `SELECT COUNT(*)::int as count
      FROM product_review
      WHERE ip_address = ?
        AND product_id = ?
        AND deleted_at IS NULL`,
      [ip, productId]
    )

    const productCount =
      productReviews.rows?.[0]?.count ?? productReviews[0]?.count ?? 0
    if (Number(productCount) >= 3) {
      return {
        isSpam: true,
        reason:
          "Too many reviews from this IP address for the same product",
      }
    }

    // Check 2: Same IP > 10 reviews in last hour
    const hourlyReviews = await knex.raw(
      `SELECT COUNT(*)::int as count
      FROM product_review
      WHERE ip_address = ?
        AND created_at > NOW() - INTERVAL '1 hour'
        AND deleted_at IS NULL`,
      [ip]
    )

    const hourlyCount =
      hourlyReviews.rows?.[0]?.count ?? hourlyReviews[0]?.count ?? 0
    if (Number(hourlyCount) >= 10) {
      return {
        isSpam: true,
        reason: "Too many reviews from this IP address in the last hour",
      }
    }

    return { isSpam: false }
  }
}

export default ProductReviewModuleService
