import { MedusaService } from "@medusajs/framework/utils"
import { Recipe, RecipeProduct } from "./models/recipe"

class RecipeModuleService extends MedusaService({
  Recipe,
  RecipeProduct,
}) {}

export default RecipeModuleService
