import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// Simple helper to get database URL from environment
const getDatabaseUrl = () => {
  return process.env.DATABASE_URL || ""
}

// GET /admin/product-brand-links - List all product-brand links
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Use dynamic import to load pg
    const { Client } = await import("pg")

    const client = new Client({
      connectionString: getDatabaseUrl(),
    })

    await client.connect()

    const result = await client.query(
      "SELECT product_id, brand_id FROM product_product_brandmodule_brand WHERE deleted_at IS NULL"
    )

    await client.end()

    res.json({
      links: result.rows,
    })
  } catch (error) {
    console.error("Error fetching product-brand links:", error)
    res.json({ links: [] })
  }
}
