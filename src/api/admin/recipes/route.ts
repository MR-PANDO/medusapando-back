import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../modules/recipe"
import RecipeModuleService from "../../../modules/recipe/service"
import { RecipeStatus } from "../../../modules/recipe/models/recipe"

// GET /admin/recipes - List all recipes with status filter
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const status = req.query.status as string | undefined
  const diet = req.query.diet as string | undefined

  // Build filters
  const filters: Record<string, any> = {}
  if (status) {
    filters.status = status
  }

  const [recipes, count] = await recipeModuleService.listAndCountRecipes(
    filters,
    {
      skip: offset,
      take: limit,
      order: { generated_at: "DESC" },
    }
  )

  // Get product counts for each recipe
  const recipesWithProducts = await Promise.all(
    recipes.map(async (recipe: any) => {
      const products = await recipeModuleService.listRecipeProducts({
        recipe_id: recipe.id,
      })
      return {
        ...recipe,
        productCount: products.length,
        canPublish: products.length > 0,
      }
    })
  )

  // Filter by diet if specified (in-memory since diets is a JSON array)
  let filteredRecipes = recipesWithProducts
  if (diet) {
    filteredRecipes = recipesWithProducts.filter((r: any) =>
      r.diets?.includes(diet)
    )
  }

  res.json({
    recipes: filteredRecipes,
    count: filteredRecipes.length,
    totalCount: count,
    limit,
    offset,
  })
}

// POST /admin/recipes - Create a new recipe manually
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  const {
    title,
    description,
    image,
    diets,
    diet_names,
    prep_time,
    cook_time,
    servings,
    difficulty,
    ingredients,
    instructions,
    nutrition,
    tips,
  } = req.body as any

  const recipe = await recipeModuleService.createRecipes({
    title,
    description,
    image,
    diets: diets || [],
    diet_names: diet_names || [],
    prep_time,
    cook_time,
    servings,
    difficulty,
    ingredients: ingredients || [],
    instructions: instructions || [],
    nutrition: nutrition || {},
    tips,
    generated_at: new Date(),
    status: RecipeStatus.DRAFT,
  } as any)

  res.json({ recipe })
}

// DELETE /admin/recipes - Delete all recipes (use with caution)
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  // First delete all recipe products
  const allProducts = await recipeModuleService.listRecipeProducts({})
  if (allProducts.length > 0) {
    await recipeModuleService.deleteRecipeProducts(allProducts.map((p: any) => p.id))
  }

  // Then delete all recipes
  const existingRecipes = await recipeModuleService.listRecipes({})
  if (existingRecipes.length > 0) {
    await recipeModuleService.deleteRecipes(existingRecipes.map((r: any) => r.id))
  }

  res.json({
    success: true,
    deleted: existingRecipes.length,
    productsDeleted: allProducts.length,
  })
}
