import { model } from "@medusajs/framework/utils"

export const ContentTranslation = model.define("content_translation", {
  id: model.id().primaryKey(),
  entity_type: model.text(), // "product" | "category"
  entity_id: model.text(),
  locale: model.text(), // "en", "fr", etc.
  title: model.text().nullable(),
  description: model.text().nullable(),
})
