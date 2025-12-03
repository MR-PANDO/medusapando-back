import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NUTRITION_MODULE } from "../../../../modules/nutrition"
import NutritionModuleService from "../../../../modules/nutrition/service"

// GET /store/nutrition/:productId - Get nutrition info for a product (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { productId } = req.params
    const nutritionService: NutritionModuleService = req.scope.resolve(NUTRITION_MODULE)

    const [nutritionEntries] = await nutritionService.listAndCountProductNutritions(
      { product_id: productId, deleted_at: null },
      { take: 1 }
    )

    if (nutritionEntries.length === 0) {
      return res.status(404).json({
        nutrition: null,
        message: "No nutrition information available for this product"
      })
    }

    const nutrition = nutritionEntries[0]

    // Transform to camelCase for frontend
    res.json({
      nutrition: {
        id: nutrition.id,
        productId: nutrition.product_id,
        servingSize: nutrition.serving_size,
        servingsPerContainer: nutrition.servings_per_container,
        nutritionData: nutrition.nutrition_data,
        labelImageUrl: nutrition.label_image_url,
        scannedAt: nutrition.scanned_at,
      }
    })
  } catch (error) {
    console.error("Error fetching nutrition info:", error)
    res.status(500).json({ error: "Failed to fetch nutrition info" })
  }
}
