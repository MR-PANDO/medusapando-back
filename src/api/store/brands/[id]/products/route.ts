import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

// GET /store/brands/:id/products - Get products for a brand (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id: brandId } = req.params
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 12
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const region_id = req.query.region_id as string

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // First, get product IDs linked to this brand using the link table
    const { data: links } = await query.graph({
      entity: "product_brand",
      fields: ["product_id", "brand_id"],
      filters: {
        brand_id: brandId,
      },
    })

    if (!links || links.length === 0) {
      return res.json({
        products: [],
        count: 0,
        limit,
        offset,
      })
    }

    const productIds = links.map((link: any) => link.product_id)

    // Now fetch the actual products with their details
    const { data: products } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "thumbnail",
        "description",
        "status",
        "created_at",
        "updated_at",
        "metadata",
        "images.*",
        "tags.*",
        "variants.*",
        "variants.prices.*",
        "variants.calculated_price.*",
      ],
      filters: {
        id: productIds,
        status: "published",
      },
      pagination: {
        skip: offset,
        take: limit,
      },
    })

    // Get total count
    const { data: allLinks } = await query.graph({
      entity: "product_brand",
      fields: ["product_id"],
      filters: {
        brand_id: brandId,
      },
    })

    // Filter to only published products for count
    const { data: publishedProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: {
        id: allLinks.map((link: any) => link.product_id),
        status: "published",
      },
    })

    res.json({
      products: products || [],
      count: publishedProducts?.length || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching products by brand:", error)

    // Fallback: try direct database query if query.graph fails
    try {
      const { Client } = await import("pg")
      const client = new Client({
        connectionString: process.env.DATABASE_URL || "",
      })

      await client.connect()

      // Get product IDs for this brand
      const linksResult = await client.query(
        `SELECT product_id FROM product_product_brandmodule_brand
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

      const productIds = linksResult.rows.map(row => row.product_id)

      // Use product module to get products
      const productService = req.scope.resolve(Modules.PRODUCT)

      const [products, count] = await productService.listAndCountProducts(
        {
          id: productIds,
          status: "published",
        },
        {
          skip: offset,
          take: limit,
          relations: ["images", "tags", "variants", "variants.prices"],
        }
      )

      res.json({
        products,
        count,
        limit,
        offset,
      })
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError)
      res.json({
        products: [],
        count: 0,
        limit,
        offset,
      })
    }
  }
}
