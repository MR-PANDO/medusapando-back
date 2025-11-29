import { model } from "@medusajs/framework/utils"

export const Municipio = model.define("municipio", {
  id: model.id().primaryKey(),
  code: model.text().unique(),           // DANE code (e.g., "05001" for Medellín)
  name: model.text(),                    // Display name (e.g., "Medellín")
  departamento_code: model.text(),       // Foreign key to departamento
  shipping_zone: model.text().nullable(), // Custom shipping zone identifier
  is_capital: model.boolean().default(false),
})
