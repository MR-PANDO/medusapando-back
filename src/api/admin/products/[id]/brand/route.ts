import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"

// GET /admin/products/:id/brand - Get product's brand
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    // Use pg directly to query the link
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    const linkResult = await client.query(
      "SELECT brand_id FROM product_product_brand_brand WHERE product_id = $1 AND deleted_at IS NULL LIMIT 1",
      [id]
    )

    await client.end()

    if (!linkResult.rows.length) {
      return res.json({ brand: null })
    }

    // Get the brand details using the brand module service
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const brand = await brandModuleService.retrieveBrand(linkResult.rows[0].brand_id)

    res.json({ brand })
  } catch (error) {
    console.error("Error fetching brand:", error)
    res.json({ brand: null })
  }
}

// POST /admin/products/:id/brand - Set product's brand
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { brand_id } = req.body as { brand_id: string | null }

  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  try {
    // Use pg directly to manage the link
    const { Client } = await import("pg")
    const crypto = await import("crypto")

    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    // Remove existing link for this product
    await client.query(
      "DELETE FROM product_product_brand_brand WHERE product_id = $1",
      [id]
    )

    // If brand_id is provided, create new link
    if (brand_id) {
      const linkId = `pbrand_${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(8).toString("hex").toUpperCase()}`.substring(0, 30)

      await client.query(
        "INSERT INTO product_product_brand_brand (id, product_id, brand_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())",
        [linkId, id, brand_id]
      )

      await client.end()

      const brand = await brandModuleService.retrieveBrand(brand_id)
      return res.json({ brand })
    }

    await client.end()
    res.json({ brand: null })
  } catch (error) {
    console.error("Error updating product brand:", error)
    res.status(500).json({ error: "Failed to update brand" })
  }
}
