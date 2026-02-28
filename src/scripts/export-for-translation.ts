/**
 * Export all products and categories to a JSON file for translation.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/export-for-translation.js
 *
 * Output:
 *   Creates ./translations-import.json with all products and categories
 *   ready to be translated. The "title" and "description" fields contain
 *   the original Spanish text — replace them with English translations.
 */

import type { ExecArgs } from "@medusajs/framework/types"
import * as fs from "fs"
import * as path from "path"

export default async function exportForTranslation({ container }: ExecArgs) {
  // Use raw pg to query all products and categories
  const { Client } = await import("pg")
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "",
  })

  await client.connect()

  // Fetch all products
  const productsResult = await client.query(
    `SELECT id, title, description FROM product WHERE deleted_at IS NULL ORDER BY title`
  )

  // Fetch all categories
  const categoriesResult = await client.query(
    `SELECT id, name, description FROM product_category WHERE deleted_at IS NULL ORDER BY name`
  )

  await client.end()

  const output = {
    products: productsResult.rows.map((row: any) => ({
      entity_id: row.id,
      locale: "en",
      title: row.title || "",
      description: row.description || "",
      _original_title_es: row.title || "",
      _original_description_es: row.description || "",
    })),
    categories: categoriesResult.rows.map((row: any) => ({
      entity_id: row.id,
      locale: "en",
      title: row.name || "",
      description: row.description || "",
      _original_name_es: row.name || "",
      _original_description_es: row.description || "",
    })),
  }

  const outputPath = path.resolve(process.cwd(), "translations-import.json")
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf-8")

  console.log(`\nExported:`)
  console.log(`  Products:   ${output.products.length}`)
  console.log(`  Categories: ${output.categories.length}`)
  console.log(`\nFile written to: ${outputPath}`)
  console.log(
    `\nNext steps:` +
      `\n  1. Open translations-import.json` +
      `\n  2. Replace the "title" and "description" fields with English translations` +
      `\n     (The _original_*_es fields are for reference only — they are ignored by the seed script)` +
      `\n  3. Run: npx medusa exec ./src/scripts/seed-translations.js`
  )
}
