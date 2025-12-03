import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NUTRITION_MODULE } from "../../../../modules/nutrition"
import NutritionModuleService from "../../../../modules/nutrition/service"

// GET /admin/nutrition/:productId - Get nutrition for a specific product
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { productId } = req.params
    const nutritionService: NutritionModuleService = req.scope.resolve(NUTRITION_MODULE)

    const [nutritionEntries] = await nutritionService.listAndCountProductNutritions(
      { product_id: productId, deleted_at: null },
      { take: 1 }
    )

    if (nutritionEntries.length === 0) {
      return res.status(404).json({ error: "Nutrition info not found for this product" })
    }

    res.json({ nutrition: nutritionEntries[0] })
  } catch (error) {
    console.error("Error fetching nutrition:", error)
    res.status(500).json({ error: "Failed to fetch nutrition info" })
  }
}

// DELETE /admin/nutrition/:productId - Delete nutrition for a product
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { productId } = req.params
    const nutritionService: NutritionModuleService = req.scope.resolve(NUTRITION_MODULE)

    const [nutritionEntries] = await nutritionService.listAndCountProductNutritions(
      { product_id: productId, deleted_at: null },
      { take: 1 }
    )

    if (nutritionEntries.length === 0) {
      return res.status(404).json({ error: "Nutrition info not found for this product" })
    }

    await nutritionService.deleteProductNutritions([nutritionEntries[0].id])

    res.json({ success: true, message: "Nutrition info deleted" })
  } catch (error) {
    console.error("Error deleting nutrition:", error)
    res.status(500).json({ error: "Failed to delete nutrition info" })
  }
}

// PUT /admin/nutrition/:productId - Manually update nutrition data
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const { productId } = req.params
    const { nutrition_data, serving_size, servings_per_container } = req.body as {
      nutrition_data?: Record<string, string>
      serving_size?: string
      servings_per_container?: string
    }

    const nutritionService: NutritionModuleService = req.scope.resolve(NUTRITION_MODULE)

    const [nutritionEntries] = await nutritionService.listAndCountProductNutritions(
      { product_id: productId, deleted_at: null },
      { take: 1 }
    )

    if (nutritionEntries.length === 0) {
      return res.status(404).json({ error: "Nutrition info not found for this product" })
    }

    // updated_at is managed automatically by Medusa
    const updateData: any = {}
    if (nutrition_data) updateData.nutrition_data = nutrition_data
    if (serving_size !== undefined) updateData.serving_size = serving_size
    if (servings_per_container !== undefined) updateData.servings_per_container = servings_per_container

    await nutritionService.updateProductNutritions([
      { id: nutritionEntries[0].id, ...updateData }
    ])

    const [updated] = await nutritionService.listAndCountProductNutritions(
      { product_id: productId, deleted_at: null },
      { take: 1 }
    )

    res.json({ success: true, nutrition: updated[0] })
  } catch (error) {
    console.error("Error updating nutrition:", error)
    res.status(500).json({ error: "Failed to update nutrition info" })
  }
}
