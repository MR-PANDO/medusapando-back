import { model } from "@medusajs/framework/utils"

export const Department = model.define("department", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text().unique(),
})
