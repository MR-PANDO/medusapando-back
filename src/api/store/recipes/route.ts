import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../modules/recipe"
import RecipeModuleService from "../../../modules/recipe/service"

// GET /store/recipes - List all recipes (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const diet = req.query.diet as string | undefined

  // Build filters - for multiple diets we filter in memory
  const filters: Record<string, any> = {}

  const [recipes, count] = await recipeModuleService.listAndCountRecipes(
    filters,
    {
      skip: offset,
      take: limit,
      order: { generated_at: "DESC" },
    }
  )

  // Transform to frontend format
  let transformedRecipes = recipes.map((recipe: any) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    image: recipe.image,
    sourceUrl: recipe.source_url,
    // Support new multiple diets format
    diets: recipe.diets || [],
    dietNames: recipe.diet_names || [],
    // Legacy single diet support (for backwards compatibility)
    diet: recipe.diets?.[0] || recipe.diet,
    dietName: recipe.diet_names?.[0] || recipe.diet_name,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    servings: recipe.servings,
    difficulty: recipe.difficulty,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    products: recipe.products,
    nutrition: recipe.nutrition,
    tips: recipe.tips,
    spoonacularId: recipe.spoonacular_id,
    generatedAt: recipe.generated_at,
  }))

  // Filter by diet if specified (check if diet is in the diets array)
  if (diet) {
    transformedRecipes = transformedRecipes.filter((r: any) =>
      r.diets?.includes(diet) || r.diet === diet
    )
  }

  res.json({
    recipes: transformedRecipes,
    count: transformedRecipes.length,
    limit,
    offset,
    generatedAt: recipes.length > 0 ? recipes[0].generated_at : null,
  })
}
