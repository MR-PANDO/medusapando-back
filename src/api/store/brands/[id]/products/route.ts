import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

// GET /store/brands/:id/products - Get products for a brand (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: brandId } = req.params
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 12
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

  try {
    // Get product IDs linked to this brand directly from database
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    // Get product IDs for this brand
    const linksResult = await client.query(
      `SELECT product_id FROM product_product_brand_brand
       WHERE brand_id = $1 AND deleted_at IS NULL`,
      [brandId]
    )

    await client.end()

    if (linksResult.rows.length === 0) {
      return res.json({
        products: [],
        count: 0,
        limit,
        offset,
      })
    }

    const allProductIds = linksResult.rows.map(row => row.product_id)

    // Use product module to get products (without prices - frontend will use store/products for full data)
    const productService = req.scope.resolve(Modules.PRODUCT)

    const [products, count] = await productService.listAndCountProducts(
      {
        id: allProductIds,
        status: "published",
      },
      {
        skip: offset,
        take: limit,
        relations: ["images", "tags", "variants"],
      }
    )

    res.json({
      products,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching products by brand:", error)
    res.json({
      products: [],
      count: 0,
      limit,
      offset,
    })
  }
}
