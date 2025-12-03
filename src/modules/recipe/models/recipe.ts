import { model } from "@medusajs/framework/utils"

// Recipe status enum
export enum RecipeStatus {
  DRAFT = "draft",       // New recipe, no products assigned yet
  PUBLISHED = "published", // Ready to show in storefront
  DISABLED = "disabled",  // Hidden from storefront
}

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
  nutrition: model.json(), // NutritionInfo
  tips: model.text().nullable(),
  spoonacular_id: model.number().nullable(), // to avoid duplicates
  generated_at: model.dateTime(),
  // New fields for admin workflow
  status: model.enum(RecipeStatus).default(RecipeStatus.DRAFT),
})

// Recipe-Product association (admin manually assigns products to recipes)
export const RecipeProduct = model.define("recipe_product", {
  id: model.id().primaryKey(),
  recipe_id: model.text(), // Foreign key to recipe
  product_id: model.text(), // Medusa product ID
  variant_id: model.text(), // Medusa variant ID
  product_title: model.text(), // Cached for display
  product_handle: model.text(), // For linking
  product_thumbnail: model.text().nullable(),
  quantity: model.text().default("1 unidad"),
  notes: model.text().nullable(), // Optional notes like "can substitute with X"
  created_at: model.dateTime(),
})
