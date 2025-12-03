import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../modules/recipe"
import RecipeModuleService from "../../../../modules/recipe/service"
import { RecipeStatus } from "../../../../modules/recipe/models/recipe"

// GET /admin/recipes/:id - Get a single recipe with its products
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id } = req.params

  try {
    const recipe = await recipeModuleService.retrieveRecipe(id)

    // Get associated products
    const products = await recipeModuleService.listRecipeProducts({
      recipe_id: id,
    })

    res.json({
      recipe: {
        ...recipe,
        products,
        productCount: products.length,
        canPublish: products.length > 0,
      },
    })
  } catch (error) {
    res.status(404).json({ error: "Recipe not found" })
  }
}

// PUT /admin/recipes/:id - Update a recipe
export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id } = req.params

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
    status,
  } = req.body as any

  try {
    // Check if trying to publish without products
    if (status === RecipeStatus.PUBLISHED) {
      const products = await recipeModuleService.listRecipeProducts({
        recipe_id: id,
      })
      if (products.length === 0) {
        return res.status(400).json({
          error: "Cannot publish recipe without products. Add at least one product first.",
        })
      }
    }

    const updateData: Record<string, any> = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (image !== undefined) updateData.image = image
    if (diets !== undefined) updateData.diets = diets
    if (diet_names !== undefined) updateData.diet_names = diet_names
    if (prep_time !== undefined) updateData.prep_time = prep_time
    if (cook_time !== undefined) updateData.cook_time = cook_time
    if (servings !== undefined) updateData.servings = servings
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (ingredients !== undefined) updateData.ingredients = ingredients
    if (instructions !== undefined) updateData.instructions = instructions
    if (nutrition !== undefined) updateData.nutrition = nutrition
    if (tips !== undefined) updateData.tips = tips
    if (status !== undefined) updateData.status = status

    const recipe = await recipeModuleService.updateRecipes({ id, ...updateData } as any)

    // Get updated products
    const products = await recipeModuleService.listRecipeProducts({
      recipe_id: id,
    })

    res.json({
      recipe: {
        ...recipe,
        products,
        productCount: products.length,
        canPublish: products.length > 0,
      },
    })
  } catch (error) {
    console.error("Error updating recipe:", error)
    res.status(500).json({ error: "Error updating recipe" })
  }
}

// DELETE /admin/recipes/:id - Delete a single recipe
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id } = req.params

  try {
    // First delete associated products
    const products = await recipeModuleService.listRecipeProducts({
      recipe_id: id,
    })
    if (products.length > 0) {
      await recipeModuleService.deleteRecipeProducts(products.map((p: any) => p.id))
    }

    // Then delete the recipe
    await recipeModuleService.deleteRecipes([id])

    res.json({
      success: true,
      deleted: id,
      productsDeleted: products.length,
    })
  } catch (error) {
    console.error("Error deleting recipe:", error)
    res.status(500).json({ error: "Error deleting recipe" })
  }
}
