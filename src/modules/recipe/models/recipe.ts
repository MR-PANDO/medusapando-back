import { model } from "@medusajs/framework/utils"

export const Recipe = model.define("recipe", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text(),
  image: model.text().nullable(),
  source_url: model.text().nullable(),
  // Multiple diets support
  diets: model.json(), // string[] - diet IDs
  diet_names: model.json(), // string[] - display names
  prep_time: model.text(),
  cook_time: model.text(),
  servings: model.number(),
  difficulty: model.text(), // Fácil, Medio, Difícil
  ingredients: model.json(), // string[]
  instructions: model.json(), // string[]
  products: model.json(), // RecipeProduct[]
  nutrition: model.json(), // NutritionInfo
  tips: model.text().nullable(),
  spoonacular_id: model.number().nullable(), // to avoid duplicates
  generated_at: model.dateTime(),
})
