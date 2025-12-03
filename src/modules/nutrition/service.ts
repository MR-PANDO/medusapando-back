import { MedusaService } from "@medusajs/framework/utils"
import { ProductNutrition } from "./models/nutrition"

class NutritionModuleService extends MedusaService({
  ProductNutrition,
}) {}

export default NutritionModuleService
