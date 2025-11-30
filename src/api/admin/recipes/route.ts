import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../modules/recipe"
import RecipeModuleService from "../../../modules/recipe/service"

// GET /admin/recipes - List all recipes
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const diet = req.query.diet as string | undefined

  // Build filters
  const filters: Record<string, any> = {}
  if (diet) {
    filters.diet = diet
  }

  const [recipes, count] = await recipeModuleService.listAndCountRecipes(
    filters,
    {
      skip: offset,
      take: limit,
      order: { generated_at: "DESC" },
    }
  )

  res.json({
    recipes,
    count,
    limit,
    offset,
  })
}

// DELETE /admin/recipes - Delete all recipes
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  const existingRecipes = await recipeModuleService.listRecipes({})
  if (existingRecipes.length > 0) {
    await recipeModuleService.deleteRecipes(existingRecipes.map((r: any) => r.id))
  }

  res.json({
    success: true,
    deleted: existingRecipes.length,
  })
}
