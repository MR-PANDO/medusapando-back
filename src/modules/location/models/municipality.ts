import { model } from "@medusajs/framework/utils"
import { Department } from "./department"
import { Neighborhood } from "./neighborhood"

export const Municipality = model.define("municipality", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  department: model.belongsTo(() => Department, { mappedBy: "municipalities" }),
  neighborhoods: model.hasMany(() => Neighborhood, { mappedBy: "municipality" }),
})
