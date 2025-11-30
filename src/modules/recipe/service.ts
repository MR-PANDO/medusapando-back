import { MedusaService } from "@medusajs/framework/utils"
import { Recipe } from "./models/recipe"

class RecipeModuleService extends MedusaService({
  Recipe,
}) {}

export default RecipeModuleService
