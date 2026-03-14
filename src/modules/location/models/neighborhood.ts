import { model } from "@medusajs/framework/utils"
import { Municipality } from "./municipality"

export const Neighborhood = model.define("neighborhood", {
  id: model.id().primaryKey(),
  name: model.text(),
  slug: model.text(),
  shipping_price: model.number().default(0),
  municipality: model.belongsTo(() => Municipality, { mappedBy: "neighborhoods" }),
})
