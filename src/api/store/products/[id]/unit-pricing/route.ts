import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/products/:id/unit-pricing - Get product's unit pricing (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    const result = await client.query(
      "SELECT metadata FROM product WHERE id = $1",
      [id]
    )

    await client.end()

    if (!result.rows.length) {
      return res.json({ unit_pricing: null })
    }

    const metadata = result.rows[0].metadata || {}
    const unitPricing = metadata.unit_pricing || null

    if (!unitPricing) {
      return res.json({ unit_pricing: null })
    }

    // Return unit pricing with helper for frontend calculation
    res.json({
      unit_pricing: {
        unit_type: unitPricing.unit_type,
        unit_amount: unitPricing.unit_amount,
        base_unit_amount: unitPricing.base_unit_amount,
        // Frontend can calculate: (price / unit_amount) * base_unit_amount
      }
    })
  } catch (error) {
    console.error("Error fetching unit pricing:", error)
    res.json({ unit_pricing: null })
  }
}
