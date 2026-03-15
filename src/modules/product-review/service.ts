import { MedusaService } from "@medusajs/framework/utils"
import { Review } from "./models/review"

class ProductReviewModuleService extends MedusaService({
  Review,
}) {
  async getAverageRating(
    productId: string
  ): Promise<{ average: number; count: number }> {
    try {
      const { Client } = await import("pg")
      const client = new Client({
        connectionString: process.env.DATABASE_URL || "",
      })
      await client.connect()

      const result = await client.query(
        `SELECT
          COALESCE(AVG(rating), 0) as average,
          COUNT(*)::int as count
        FROM product_review
        WHERE product_id = $1
          AND status = 'approved'
          AND deleted_at IS NULL`,
        [productId]
      )
      await client.end()

      const row = result.rows[0]
      return {
        average: parseFloat(Number(row?.average || 0).toFixed(2)),
        count: Number(row?.count || 0),
      }
    } catch (err: any) {
      console.error("[Reviews] getAverageRating error:", err.message)
      return { average: 0, count: 0 }
    }
  }

  async checkSpam(
    ip: string,
    productId: string
  ): Promise<{ isSpam: boolean; reason?: string }> {
    try {
      const { Client } = await import("pg")
      const client = new Client({
        connectionString: process.env.DATABASE_URL || "",
      })
      await client.connect()

      // Check 1: Same IP + same product > 3 reviews
      const productResult = await client.query(
        `SELECT COUNT(*)::int as count
        FROM product_review
        WHERE ip_address = $1
          AND product_id = $2
          AND deleted_at IS NULL`,
        [ip, productId]
      )

      if (Number(productResult.rows[0]?.count || 0) >= 3) {
        await client.end()
        return {
          isSpam: true,
          reason: "Demasiadas reseñas desde esta dirección para el mismo producto",
        }
      }

      // Check 2: Same IP > 10 reviews in last hour
      const hourlyResult = await client.query(
        `SELECT COUNT(*)::int as count
        FROM product_review
        WHERE ip_address = $1
          AND created_at > NOW() - INTERVAL '1 hour'
          AND deleted_at IS NULL`,
        [ip]
      )

      await client.end()

      if (Number(hourlyResult.rows[0]?.count || 0) >= 10) {
        return {
          isSpam: true,
          reason: "Demasiadas reseñas en la última hora",
        }
      }

      return { isSpam: false }
    } catch (err: any) {
      console.error("[Reviews] checkSpam error:", err.message)
      return { isSpam: false }
    }
  }
}

export default ProductReviewModuleService
