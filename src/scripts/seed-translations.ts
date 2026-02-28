/**
 * Seed script for content translations.
 *
 * Queries all products and categories from the database, translates them
 * from Spanish to English using the Claude API, and inserts the translations
 * into the content_translation table.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/seed-translations.js
 *
 * Required env:
 *   ANTHROPIC_API_KEY — Claude API key for translation
 *
 * Optional env:
 *   TRANSLATION_BATCH_SIZE — items per Claude API call (default: 20)
 *   TRANSLATION_SKIP_EXISTING — "true" to skip already-translated entities (default: "true")
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { CONTENT_TRANSLATION_MODULE } from "../modules/content-translation"
import ContentTranslationModuleService from "../modules/content-translation/service"
import Anthropic from "@anthropic-ai/sdk"

type EntityRow = {
  id: string
  title: string
  description: string | null
}

type TranslationResult = {
  id: string
  title: string
  description: string | null
}

const BATCH_SIZE = parseInt(process.env.TRANSLATION_BATCH_SIZE || "20", 10)
const SKIP_EXISTING = process.env.TRANSLATION_SKIP_EXISTING !== "false"

async function translateBatch(
  client: Anthropic,
  items: EntityRow[],
  entityType: "product" | "category"
): Promise<TranslationResult[]> {
  const nameField = entityType === "category" ? "name" : "title"

  const itemsForPrompt = items.map((item) => ({
    id: item.id,
    [nameField]: item.title,
    description: item.description || "",
  }))

  const prompt = `Translate the following ${entityType} data from Spanish to English.
This is for an e-commerce health food store (vitamins, supplements, organic foods, etc.).

IMPORTANT RULES:
- Translate product names/titles naturally for an English-speaking audience
- Keep brand names as-is (do not translate brand names)
- Keep measurement units (gr, ml, kg, und) — convert "und" to "units" or "ct"
- If a description is empty, return empty string
- Return ONLY valid JSON, no markdown, no explanation

Input (Spanish):
${JSON.stringify(itemsForPrompt, null, 2)}

Return a JSON array with the same structure, translated to English. Each object must have:
- "id": same id as input
- "${nameField}": translated ${nameField}
- "description": translated description (or empty string)

Output (English JSON array only):`

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  })

  const text =
    response.content[0].type === "text" ? response.content[0].text : ""

  // Extract JSON from response (handle potential markdown wrapping)
  let jsonStr = text.trim()
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "")
  }

  const parsed = JSON.parse(jsonStr)

  if (!Array.isArray(parsed)) {
    throw new Error("Expected array response from Claude")
  }

  return parsed.map((item: any) => ({
    id: item.id,
    title: item[nameField] || item.title || item.name || "",
    description: item.description || null,
  }))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default async function seedTranslations({ container }: ExecArgs) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error(
      "ANTHROPIC_API_KEY environment variable is required.\n" +
        "Set it and re-run the script."
    )
    process.exit(1)
  }

  const anthropic = new Anthropic({ apiKey })
  const service: ContentTranslationModuleService =
    container.resolve(CONTENT_TRANSLATION_MODULE)

  // Query all products and categories from database
  const { Client } = await import("pg")
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL || "",
  })
  await pgClient.connect()

  const productsResult = await pgClient.query(
    `SELECT id, title, description FROM product WHERE deleted_at IS NULL ORDER BY title`
  )
  const categoriesResult = await pgClient.query(
    `SELECT id, name as title, description FROM product_category WHERE deleted_at IS NULL ORDER BY name`
  )

  await pgClient.end()

  const products: EntityRow[] = productsResult.rows
  const categories: EntityRow[] = categoriesResult.rows

  console.log(`Found ${products.length} products and ${categories.length} categories`)
  console.log(`Batch size: ${BATCH_SIZE}, Skip existing: ${SKIP_EXISTING}`)

  let created = 0
  let updated = 0
  let skipped = 0
  let errors = 0

  // --- Translate and seed products ---
  console.log(`\n--- Translating products (${products.length}) ---`)

  // Filter out already-translated products if SKIP_EXISTING
  let productsToTranslate = products
  if (SKIP_EXISTING) {
    const toCheck: EntityRow[] = []
    for (const product of products) {
      const existing = await (service as any).listContentTranslations(
        { entity_type: "product", entity_id: product.id, locale: "en" },
        { take: 1 }
      )
      if (existing && existing.length > 0) {
        skipped++
      } else {
        toCheck.push(product)
      }
    }
    productsToTranslate = toCheck
    if (skipped > 0) {
      console.log(`Skipped ${skipped} already-translated products`)
    }
  }

  for (let i = 0; i < productsToTranslate.length; i += BATCH_SIZE) {
    const batch = productsToTranslate.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(productsToTranslate.length / BATCH_SIZE)

    console.log(
      `  Product batch ${batchNum}/${totalBatches} (${batch.length} items)...`
    )

    try {
      const translations = await translateBatch(anthropic, batch, "product")

      for (const translation of translations) {
        try {
          await service.upsertTranslation("product", translation.id, "en", {
            title: translation.title || null,
            description: translation.description || null,
          })
          created++
        } catch (err) {
          errors++
          console.error(`  Error saving product ${translation.id}:`, err)
        }
      }
    } catch (err) {
      errors += batch.length
      console.error(`  Error translating batch ${batchNum}:`, err)
    }

    // Rate limiting: wait between batches
    if (i + BATCH_SIZE < productsToTranslate.length) {
      await sleep(1000)
    }
  }

  // --- Translate and seed categories ---
  console.log(`\n--- Translating categories (${categories.length}) ---`)

  let categoriesToTranslate = categories
  if (SKIP_EXISTING) {
    const toCheck: EntityRow[] = []
    let catSkipped = 0
    for (const category of categories) {
      const existing = await (service as any).listContentTranslations(
        { entity_type: "category", entity_id: category.id, locale: "en" },
        { take: 1 }
      )
      if (existing && existing.length > 0) {
        catSkipped++
        skipped++
      } else {
        toCheck.push(category)
      }
    }
    categoriesToTranslate = toCheck
    if (catSkipped > 0) {
      console.log(`Skipped ${catSkipped} already-translated categories`)
    }
  }

  for (let i = 0; i < categoriesToTranslate.length; i += BATCH_SIZE) {
    const batch = categoriesToTranslate.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(categoriesToTranslate.length / BATCH_SIZE)

    console.log(
      `  Category batch ${batchNum}/${totalBatches} (${batch.length} items)...`
    )

    try {
      const translations = await translateBatch(anthropic, batch, "category")

      for (const translation of translations) {
        try {
          await service.upsertTranslation("category", translation.id, "en", {
            title: translation.title || null,
            description: translation.description || null,
          })
          created++
        } catch (err) {
          errors++
          console.error(`  Error saving category ${translation.id}:`, err)
        }
      }
    } catch (err) {
      errors += batch.length
      console.error(`  Error translating batch ${batchNum}:`, err)
    }

    if (i + BATCH_SIZE < categoriesToTranslate.length) {
      await sleep(1000)
    }
  }

  console.log("\n--- Seed Results ---")
  console.log(`Created/Updated: ${created}`)
  console.log(`Skipped (existing): ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log(
    "\nDon't forget to trigger a MeiliSearch full re-index after seeding:"
  )
  console.log("  POST /admin/meilisearch/sync")
}
