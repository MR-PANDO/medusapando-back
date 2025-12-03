import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NUTRITION_MODULE } from "../../../modules/nutrition"
import NutritionModuleService from "../../../modules/nutrition/service"

// GET /admin/nutrition - List all product nutrition entries
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const nutritionService: NutritionModuleService = req.scope.resolve(NUTRITION_MODULE)

    const { limit = 50, offset = 0 } = req.query

    const [nutritionEntries, count] = await nutritionService.listAndCountProductNutritions(
      { deleted_at: null },
      {
        take: Number(limit),
        skip: Number(offset),
        order: { scanned_at: "DESC" },
      }
    )

    res.json({
      nutrition_entries: nutritionEntries,
      count,
      limit: Number(limit),
      offset: Number(offset),
    })
  } catch (error) {
    console.error("Error listing nutrition entries:", error)
    res.status(500).json({ error: "Failed to list nutrition entries" })
  }
}
