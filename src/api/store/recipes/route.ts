import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../modules/recipe"
import RecipeModuleService from "../../../modules/recipe/service"

// GET /store/recipes - List all recipes (public)
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

  // Transform to frontend format
  const transformedRecipes = recipes.map((recipe: any) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    image: recipe.image,
    sourceUrl: recipe.source_url,
    diet: recipe.diet,
    dietName: recipe.diet_name,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    products: recipe.products,
    nutrition: recipe.nutrition,
    tips: recipe.tips,
    generatedAt: recipe.generated_at,
  }))

  res.json({
    recipes: transformedRecipes,
    count,
    limit,
    offset,
    generatedAt: recipes.length > 0 ? recipes[0].generated_at : null,
  })
}
