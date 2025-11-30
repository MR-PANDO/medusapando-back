import { model } from "@medusajs/framework/utils"

export const Recipe = model.define("recipe", {
  id: model.id().primaryKey(),
  title: model.text(),
  description: model.text(),
  image: model.text().nullable(),
  source_url: model.text().nullable(),
  diet: model.text(), // diet id (vegano, keto, etc.)
  diet_name: model.text(), // display name
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
