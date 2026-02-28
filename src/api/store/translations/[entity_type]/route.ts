import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/translations/:entity_type?locale=en&entity_ids=id1,id2,id3
// Batch translation lookup for product listings (raw pg for performance)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { entity_type } = req.params
  const locale = req.query.locale as string
  const entityIdsParam = req.query.entity_ids as string

  if (!locale) {
    return res.status(400).json({ message: "locale query parameter is required" })
  }

  if (!entityIdsParam) {
    return res.status(400).json({ message: "entity_ids query parameter is required" })
  }

  const entityIds = entityIdsParam.split(",").filter(Boolean)

  if (entityIds.length === 0) {
    return res.json({ translations: {} })
  }

  // Limit to 100 IDs per request
  if (entityIds.length > 100) {
    return res.status(400).json({ message: "Maximum 100 entity_ids per request" })
  }

  try {
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    // Build parameterized query with ANY array
    const result = await client.query(
      `SELECT entity_id, title, description FROM content_translation
       WHERE entity_type = $1 AND locale = $2 AND entity_id = ANY($3) AND deleted_at IS NULL`,
      [entity_type, locale, entityIds]
    )

    await client.end()

    // Build map keyed by entity_id
    const translations: Record<string, { title: string | null; description: string | null }> = {}
    for (const row of result.rows) {
      translations[row.entity_id] = {
        title: row.title,
        description: row.description,
      }
    }

    res.json({ translations })
  } catch (error) {
    console.error("Error fetching translations:", error)
    res.json({ translations: {} })
  }
}
