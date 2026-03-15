import { model } from "@medusajs/framework/utils"

export const LowStockSettings = model.define("low_stock_settings", {
  id: model.id().primaryKey(),
  threshold: model.number().default(5),
  notification_email: model.text().nullable(),
  enabled: model.boolean().default(false),
  morning_time: model.text().default("08:00"),
  afternoon_time: model.text().default("14:00"),
})
