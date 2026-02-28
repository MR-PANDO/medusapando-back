import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

// GET /store/translations/:entity_type/:entity_id?locale=en
// Single entity translation lookup (raw pg for performance)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { entity_type, entity_id } = req.params
  const locale = req.query.locale as string

  if (!locale) {
    return res.status(400).json({ message: "locale query parameter is required" })
  }

  try {
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })

    await client.connect()

    const result = await client.query(
      `SELECT title, description FROM content_translation
       WHERE entity_type = $1 AND entity_id = $2 AND locale = $3 AND deleted_at IS NULL
       LIMIT 1`,
      [entity_type, entity_id, locale]
    )

    await client.end()

    if (!result.rows.length) {
      return res.json({ translation: null })
    }

    res.json({
      translation: {
        title: result.rows[0].title,
        description: result.rows[0].description,
      },
    })
  } catch (error) {
    console.error("Error fetching translation:", error)
    res.json({ translation: null })
  }
}
