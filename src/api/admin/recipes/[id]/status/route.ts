import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../../modules/recipe"
import RecipeModuleService from "../../../../../modules/recipe/service"

const VALID_STATUSES = ["draft", "published", "disabled"]

// PUT /admin/recipes/:id/status - Quick status update
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id } = req.params
  const { status } = req.body as { status: string }

  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      error: "Invalid status. Must be one of: draft, published, disabled",
    })
  }

  try {
    // Check if trying to publish without products
    if (status === "published") {
      const products = await recipeModuleService.listRecipeProducts({
        recipe_id: id,
      })
      if (products.length === 0) {
        return res.status(400).json({
          error: "Cannot publish recipe without products. Add at least one product first.",
        })
      }
    }

    const recipe = await recipeModuleService.updateRecipes({ id, status } as any)

    res.json({
      success: true,
      recipe: {
        id: recipe.id,
        title: recipe.title,
        status: recipe.status,
      },
    })
  } catch (error) {
    console.error("Error updating recipe status:", error)
    res.status(500).json({ error: "Error updating status" })
  }
}
