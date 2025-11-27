import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/products/:id/brand - Get product's brand (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    // Use pg directly to query the link and brand
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    const result = await client.query(
      `SELECT b.id, b.name, b.handle
       FROM brand b
       INNER JOIN product_product_brandmodule_brand pb ON b.id = pb.brand_id
       WHERE pb.product_id = $1 AND pb.deleted_at IS NULL
       LIMIT 1`,
      [id]
    )

    await client.end()

    if (!result.rows.length) {
      return res.json({ brand: null })
    }

    res.json({
      brand: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        handle: result.rows[0].handle,
      }
    })
  } catch (error) {
    console.error("Error fetching brand:", error)
    res.json({ brand: null })
  }
}
