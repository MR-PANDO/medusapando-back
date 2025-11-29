import { model } from "@medusajs/framework/utils"

export const Departamento = model.define("departamento", {
  id: model.id().primaryKey(),
  code: model.text().unique(),      // DANE code (e.g., "05" for Antioquia)
  name: model.text(),               // Display name (e.g., "Antioquia")
  iso_code: model.text().nullable(), // ISO 3166-2 code (e.g., "CO-ANT")
})
