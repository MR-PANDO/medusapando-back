import { model } from "@medusajs/framework/utils"

export const NubexSettings = model.define("nubex_settings", {
  id: model.id().primaryKey(),
  low_stock_threshold: model.number().default(5),
  notification_email: model.text().nullable(),
  low_stock_enabled: model.boolean().default(false),
})
