import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../../../modules/recipe"
import RecipeModuleService from "../../../../../../modules/recipe/service"

// GET /admin/recipes/:id/products/:productId - Get a single product
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { productId } = req.params

  try {
    const product = await recipeModuleService.retrieveRecipeProduct(productId)
    res.json({ product })
  } catch (error) {
    res.status(404).json({ error: "Product not found" })
  }
}

// PUT /admin/recipes/:id/products/:productId - Update a product in a recipe
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { productId } = req.params

  const { quantity, notes } = req.body as any

  try {
    const updateData: Record<string, any> = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (notes !== undefined) updateData.notes = notes

    const product = await recipeModuleService.updateRecipeProducts({ id: productId, ...updateData } as any)

    res.json({ product })
  } catch (error) {
    console.error("Error updating recipe product:", error)
    res.status(500).json({ error: "Error updating product" })
  }
}

// DELETE /admin/recipes/:id/products/:productId - Remove a product from a recipe
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { productId } = req.params

  try {
    await recipeModuleService.deleteRecipeProducts([productId])

    res.json({
      success: true,
      deleted: productId,
    })
  } catch (error) {
    console.error("Error deleting recipe product:", error)
    res.status(500).json({ error: "Error deleting product" })
  }
}
