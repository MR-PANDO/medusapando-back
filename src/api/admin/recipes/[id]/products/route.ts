import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../../modules/recipe"
import RecipeModuleService from "../../../../../modules/recipe/service"

// GET /admin/recipes/:id/products - List products for a recipe
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id } = req.params

  const products = await recipeModuleService.listRecipeProducts({
    recipe_id: id,
  })

  res.json({ products })
}

// POST /admin/recipes/:id/products - Add a product to a recipe
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id: recipe_id } = req.params

  const {
    product_id,
    variant_id,
    product_title,
    product_handle,
    product_thumbnail,
    quantity,
    notes,
  } = req.body as any

  if (!product_id || !variant_id || !product_title || !product_handle) {
    return res.status(400).json({
      error: "product_id, variant_id, product_title, and product_handle are required",
    })
  }

  // Check if product already exists in recipe
  const existingProducts = await recipeModuleService.listRecipeProducts({
    recipe_id,
    product_id,
  })

  if (existingProducts.length > 0) {
    return res.status(400).json({
      error: "This product is already added to the recipe",
    })
  }

  const recipeProduct = await recipeModuleService.createRecipeProducts({
    recipe_id,
    product_id,
    variant_id,
    product_title,
    product_handle,
    product_thumbnail: product_thumbnail || null,
    quantity: quantity || "1 unidad",
    notes: notes || null,
  } as any)

  res.json({ product: recipeProduct })
}

// DELETE /admin/recipes/:id/products - Remove all products from a recipe
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)
  const { id: recipe_id } = req.params

  const products = await recipeModuleService.listRecipeProducts({
    recipe_id,
  })

  if (products.length > 0) {
    await recipeModuleService.deleteRecipeProducts(products.map((p: any) => p.id))
  }

  res.json({
    success: true,
    deleted: products.length,
  })
}
