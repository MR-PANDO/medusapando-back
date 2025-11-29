import { model } from "@medusajs/framework/utils"

export const ShippingZone = model.define("colombia_shipping_zone", {
  id: model.id().primaryKey(),
  name: model.text(),                      // Zone name (e.g., "Medellín Metro", "Antioquia Rural")
  code: model.text().unique(),             // Zone code for reference
  base_price: model.bigNumber(),           // Base shipping price in COP
  express_price: model.bigNumber().nullable(), // Express shipping price
  same_day_price: model.bigNumber().nullable(), // Same-day delivery price
  estimated_days_min: model.number().default(1),
  estimated_days_max: model.number().default(3),
  is_active: model.boolean().default(true),
})
