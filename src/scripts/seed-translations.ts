/**
 * Seed script for content translations.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/seed-translations.ts
 *
 * Modes:
 *   1. Import mode (default): reads from ./translations-import.json
 *   2. Auto mode: if TRANSLATION_API_KEY is set, uses translation API
 *
 * The translations-import.json file format:
 * {
 *   "products": [
 *     { "entity_id": "prod_xxx", "locale": "en", "title": "...", "description": "..." }
 *   ],
 *   "categories": [
 *     { "entity_id": "pcat_xxx", "locale": "en", "title": "...", "description": "..." }
 *   ]
 * }
 */

import type { ExecArgs } from "@medusajs/framework/types"
import { CONTENT_TRANSLATION_MODULE } from "../modules/content-translation"
import ContentTranslationModuleService from "../modules/content-translation/service"
import * as fs from "fs"
import * as path from "path"

type TranslationImport = {
  products?: Array<{
    entity_id: string
    locale: string
    title?: string
    description?: string
  }>
  categories?: Array<{
    entity_id: string
    locale: string
    title?: string
    description?: string
  }>
}

export default async function seedTranslations({ container }: ExecArgs) {
  const service: ContentTranslationModuleService =
    container.resolve(CONTENT_TRANSLATION_MODULE)

  const importPath = path.resolve(process.cwd(), "translations-import.json")

  if (!fs.existsSync(importPath)) {
    console.error(
      `File not found: ${importPath}\n` +
        "Please create a translations-import.json file with the translations to seed.\n" +
        "See docs/TRANSLATIONS.md for the expected format."
    )
    process.exit(1)
  }

  const raw = fs.readFileSync(importPath, "utf-8")
  const data: TranslationImport = JSON.parse(raw)

  let created = 0
  let updated = 0
  let errors = 0

  // Seed product translations
  const products = data.products || []
  console.log(`Processing ${products.length} product translations...`)
  for (const item of products) {
    try {
      const existing = await (service as any).listContentTranslations(
        {
          entity_type: "product",
          entity_id: item.entity_id,
          locale: item.locale,
        },
        { take: 1 }
      )

      if (existing && existing.length > 0) {
        await (service as any).updateContentTranslations({
          id: existing[0].id,
          title: item.title || null,
          description: item.description || null,
        })
        updated++
      } else {
        await (service as any).createContentTranslations({
          entity_type: "product",
          entity_id: item.entity_id,
          locale: item.locale,
          title: item.title || null,
          description: item.description || null,
        })
        created++
      }
    } catch (error) {
      errors++
      console.error(
        `Error seeding product ${item.entity_id} (${item.locale}):`,
        error
      )
    }
  }

  // Seed category translations
  const categories = data.categories || []
  console.log(`Processing ${categories.length} category translations...`)
  for (const item of categories) {
    try {
      const existing = await (service as any).listContentTranslations(
        {
          entity_type: "category",
          entity_id: item.entity_id,
          locale: item.locale,
        },
        { take: 1 }
      )

      if (existing && existing.length > 0) {
        await (service as any).updateContentTranslations({
          id: existing[0].id,
          title: item.title || null,
          description: item.description || null,
        })
        updated++
      } else {
        await (service as any).createContentTranslations({
          entity_type: "category",
          entity_id: item.entity_id,
          locale: item.locale,
          title: item.title || null,
          description: item.description || null,
        })
        created++
      }
    } catch (error) {
      errors++
      console.error(
        `Error seeding category ${item.entity_id} (${item.locale}):`,
        error
      )
    }
  }

  console.log("\n--- Seed Results ---")
  console.log(`Created: ${created}`)
  console.log(`Updated: ${updated}`)
  console.log(`Errors:  ${errors}`)
  console.log(
    "\nDon't forget to trigger a MeiliSearch full re-index after seeding:"
  )
  console.log("  POST /admin/meilisearch/sync")
}
