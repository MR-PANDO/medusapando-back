import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../modules/recipe"
import RecipeModuleService from "../../../modules/recipe/service"
import { RecipeStatus } from "../../../modules/recipe/models/recipe"

// GET /store/recipes - List published recipes with their products
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const diet = req.query.diet as string | undefined

  // Only fetch published recipes
  const filters: Record<string, any> = {
    status: RecipeStatus.PUBLISHED,
  }

  const [recipes, count] = await recipeModuleService.listAndCountRecipes(
    filters,
    {
      skip: offset,
      take: limit,
      order: { generated_at: "DESC" },
    }
  )

  // Get products for each recipe
  const recipesWithProducts = await Promise.all(
    recipes.map(async (recipe: any) => {
      const products = await recipeModuleService.listRecipeProducts({
        recipe_id: recipe.id,
      })
      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        image: recipe.image,
        sourceUrl: recipe.source_url,
        diets: recipe.diets || [],
        dietNames: recipe.diet_names || [],
        // Legacy single diet support
        diet: recipe.diets?.[0],
        dietName: recipe.diet_names?.[0],
        prepTime: recipe.prep_time,
        cookTime: recipe.cook_time,
        servings: recipe.servings,
        difficulty: recipe.difficulty,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        products: products.map((p: any) => ({
          id: p.product_id,
          variantId: p.variant_id,
          title: p.product_title,
          handle: p.product_handle,
          thumbnail: p.product_thumbnail,
          quantity: p.quantity,
          notes: p.notes,
        })),
        nutrition: recipe.nutrition,
        tips: recipe.tips,
        spoonacularId: recipe.spoonacular_id,
        generatedAt: recipe.generated_at,
      }
    })
  )

  // Filter by diet if specified
  let filteredRecipes = recipesWithProducts
  if (diet) {
    filteredRecipes = recipesWithProducts.filter((r: any) =>
      r.diets?.includes(diet) || r.diet === diet
    )
  }

  res.json({
    recipes: filteredRecipes,
    count: filteredRecipes.length,
    limit,
    offset,
    generatedAt: recipes.length > 0 ? recipes[0].generated_at : null,
  })
}
