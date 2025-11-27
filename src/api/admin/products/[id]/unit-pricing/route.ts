import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

type UnitPricing = {
  unit_type: string
  unit_amount: number
  base_unit_amount: number
}

// GET /admin/products/:id/unit-pricing - Get product's unit pricing
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
    res.json({ unit_pricing: metadata.unit_pricing || null })
  } catch (error) {
    console.error("Error fetching unit pricing:", error)
    res.json({ unit_pricing: null })
  }
}

// POST /admin/products/:id/unit-pricing - Set product's unit pricing
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { unit_pricing } = req.body as { unit_pricing: UnitPricing }

  try {
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    // First get existing metadata
    const existingResult = await client.query(
      "SELECT metadata FROM product WHERE id = $1",
      [id]
    )

    if (!existingResult.rows.length) {
      await client.end()
      return res.status(404).json({ error: "Product not found" })
    }

    const existingMetadata = existingResult.rows[0].metadata || {}

    // Merge unit_pricing into metadata
    const newMetadata = {
      ...existingMetadata,
      unit_pricing: unit_pricing,
    }

    // Update the product metadata
    await client.query(
      "UPDATE product SET metadata = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(newMetadata), id]
    )

    await client.end()

    res.json({ unit_pricing })
  } catch (error) {
    console.error("Error saving unit pricing:", error)
    res.status(500).json({ error: "Failed to save unit pricing" })
  }
}
