import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../modules/recipe"
import RecipeModuleService from "../../../../modules/recipe/service"

const MINIO_CDN_URL = process.env.MINIO_CDN_URL || "https://minio-ps8cwskk08k8gssooc00s80k.pando.tecnoclinica.com/vitaintegralimages"
const CRON_SECRET = process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || ""

interface MinioRecipe {
  id: string
  title: string
  description: string
  image: string
  sourceUrl: string
  diets: string[]
  dietNames: string[]
  prepTime: string
  cookTime: string
  servings: number
  difficulty: string
  ingredients: string[]
  instructions: string[]
  products: Array<{
    id: string
    variantId: string
    title: string
    handle: string
    thumbnail: string
    quantity: string
    price: number
  }>
  nutrition: {
    calories: number
    carbs: number
    protein: number
    fat: number
    fiber?: number
  }
  tips?: string
  spoonacularId: number
  generatedAt: string
}

// POST /admin/recipes/import - Import recipes from Minio JSON to PostgreSQL
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Validate secret for authentication
    const authHeader = req.headers.authorization
    const headerSecret = authHeader?.replace("Bearer ", "")
    const querySecret = req.query.secret as string
    const providedSecret = headerSecret || querySecret

    if (providedSecret && providedSecret !== CRON_SECRET) {
      return res.status(401).json({ error: "Invalid secret" })
    }

    const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

    console.log("Fetching recipes from Minio CDN...")

    // Fetch recipes from Minio
    const response = await fetch(`${MINIO_CDN_URL}/recipes.json`)
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch recipes from Minio" })
    }

    const data = await response.json()
    const minioRecipes: MinioRecipe[] = data.recipes || []

    console.log(`Found ${minioRecipes.length} recipes in Minio`)

    // Get existing recipes to avoid duplicates
    const existingRecipes = await recipeModuleService.listRecipes({})
    const existingSpoonacularIds = new Set(
      existingRecipes.map((r: any) => r.spoonacular_id).filter(Boolean)
    )

    console.log(`Found ${existingSpoonacularIds.size} existing recipes in database`)

    const createdRecipes: any[] = []
    const skippedRecipes: string[] = []

    for (const minioRecipe of minioRecipes) {
      // Skip if already exists
      if (existingSpoonacularIds.has(minioRecipe.spoonacularId)) {
        skippedRecipes.push(minioRecipe.title)
        continue
      }

      // Create recipe in PostgreSQL
      const recipeData = {
        title: minioRecipe.title,
        description: minioRecipe.description,
        image: minioRecipe.image,
        source_url: minioRecipe.sourceUrl,
        diets: minioRecipe.diets,
        diet_names: minioRecipe.dietNames,
        prep_time: minioRecipe.prepTime,
        cook_time: minioRecipe.cookTime,
        servings: minioRecipe.servings,
        difficulty: minioRecipe.difficulty,
        ingredients: minioRecipe.ingredients,
        instructions: minioRecipe.instructions,
        nutrition: minioRecipe.nutrition,
        tips: minioRecipe.tips || null,
        spoonacular_id: minioRecipe.spoonacularId,
        generated_at: new Date(minioRecipe.generatedAt),
        status: "published", // Import as published since they have products
      }

      const recipe = await recipeModuleService.createRecipes(recipeData as any)

      // Add products if they exist
      if (minioRecipe.products && minioRecipe.products.length > 0) {
        for (const product of minioRecipe.products) {
          await recipeModuleService.createRecipeProducts({
            recipe_id: recipe.id,
            product_id: product.id,
            variant_id: product.variantId,
            product_title: product.title,
            product_handle: product.handle,
            product_thumbnail: product.thumbnail,
            quantity: product.quantity,
            notes: null,
          } as any)
        }
      }

      createdRecipes.push(recipe)
      console.log(`Imported: ${minioRecipe.title}`)
    }

    console.log(`Imported ${createdRecipes.length} recipes, skipped ${skippedRecipes.length}`)

    res.json({
      success: true,
      imported: createdRecipes.length,
      skipped: skippedRecipes.length,
      skippedTitles: skippedRecipes,
      totalInDatabase: existingRecipes.length + createdRecipes.length,
    })
  } catch (error) {
    console.error("Error importing recipes:", error)
    res.status(500).json({ error: "Error importing recipes", details: String(error) })
  }
}

// GET /admin/recipes/import - Also support GET
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  return POST(req, res)
}
