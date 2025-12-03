import { model } from "@medusajs/framework/utils"

export const Recipe = model.define("recipe", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text(),
  image: model.text().nullable(),
  source_url: model.text().nullable(),
  diets: model.json(),
  diet_names: model.json(),
  prep_time: model.text(),
  cook_time: model.text(),
  servings: model.number(),
  difficulty: model.text(),
  ingredients: model.json(),
  instructions: model.json(),
  nutrition: model.json(),
  tips: model.text().nullable(),
  spoonacular_id: model.number().nullable(),
  generated_at: model.dateTime(),
  status: model.text().default("draft"),
})

export const RecipeProduct = model.define("recipe_product", {
  id: model.id().primaryKey(),
  recipe_id: model.text(),
  product_id: model.text(),
  variant_id: model.text(),
  product_title: model.text(),
  product_handle: model.text(),
  product_thumbnail: model.text().nullable(),
  quantity: model.text().default("1 unidad"),
  notes: model.text().nullable(),
})
