import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../modules/recipe"
import RecipeModuleService from "../../../../modules/recipe/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || ""
const CRON_SECRET = process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || ""

// Map our diet IDs to Spoonacular diet parameters
const DIETS = [
  { id: "vegano", name: "Vegano", spoonacularDiet: "vegan", spoonacularIntolerances: "" },
  { id: "vegetariano", name: "Vegetariano", spoonacularDiet: "vegetarian", spoonacularIntolerances: "" },
  { id: "sin-lactosa", name: "Sin Lactosa", spoonacularDiet: "", spoonacularIntolerances: "dairy" },
  { id: "organico", name: "Orgánico", spoonacularDiet: "whole30", spoonacularIntolerances: "" },
  { id: "sin-azucar", name: "Sin Azúcar", spoonacularDiet: "", spoonacularIntolerances: "", maxSugar: 5 },
  { id: "paleo", name: "Paleo", spoonacularDiet: "paleo", spoonacularIntolerances: "" },
  { id: "sin-gluten", name: "Sin Gluten", spoonacularDiet: "gluten free", spoonacularIntolerances: "gluten" },
  { id: "keto", name: "Keto", spoonacularDiet: "ketogenic", spoonacularIntolerances: "" },
]

interface Product {
  id: string
  title: string
  handle: string
  thumbnail?: string
  tags?: Array<{ value: string }>
  variants?: Array<{ id: string; calculated_price?: { calculated_amount: number } }>
}

interface RecipeProduct {
  id: string
  variantId: string
  title: string
  handle: string
  thumbnail?: string
  quantity: string
  price?: number
}

interface NutritionInfo {
  calories: number
  carbs: number
  protein: number
  fat: number
  fiber?: number
}

interface SpoonacularRecipe {
  id: number
  title: string
  image: string
  sourceUrl: string
  readyInMinutes: number
  preparationMinutes?: number
  cookingMinutes?: number
  servings: number
  summary: string
  extendedIngredients: Array<{
    original: string
    name: string
  }>
  analyzedInstructions: Array<{
    steps: Array<{
      step: string
    }>
  }>
  nutrition?: {
    nutrients: Array<{
      name: string
      amount: number
      unit: string
    }>
  }
}

async function fetchProducts(req: MedusaRequest): Promise<Product[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "tags.*", "variants.*"],
    pagination: { take: 200 },
  })

  return products as unknown as Product[]
}

// Find matching products from our store based on recipe ingredients
function findMatchingProducts(
  ingredientNames: string[],
  products: Product[],
  dietId: string
): RecipeProduct[] {
  const matchedProducts: RecipeProduct[] = []
  const usedProductIds = new Set<string>()

  // First, try to match products that have the diet tag
  const dietProducts = products.filter((p) => {
    const tags = p.tags?.map((t) => t.value.toLowerCase()) || []
    return tags.includes(dietId.toLowerCase())
  })

  // Search for matches in ingredients
  for (const ingredientName of ingredientNames) {
    const lowerIngredient = ingredientName.toLowerCase()

    // Try diet-compatible products first, then all products
    const searchPools = [dietProducts, products]

    for (const pool of searchPools) {
      for (const product of pool) {
        if (usedProductIds.has(product.id)) continue

        const productTitle = product.title.toLowerCase()

        // Check if product name matches ingredient
        const ingredientWords = lowerIngredient.split(/\s+/)
        const hasMatch = ingredientWords.some(
          (word) => word.length > 3 && productTitle.includes(word)
        )

        if (hasMatch && product.variants?.[0]) {
          matchedProducts.push({
            id: product.id,
            variantId: product.variants[0].id,
            title: product.title,
            handle: product.handle,
            thumbnail: product.thumbnail,
            quantity: "1 unidad",
            price: (product.variants[0] as any).calculated_price?.calculated_amount,
          })
          usedProductIds.add(product.id)

          if (matchedProducts.length >= 4) {
            return matchedProducts
          }
          break
        }
      }
    }
  }

  return matchedProducts
}

function getDifficulty(readyInMinutes: number): "Fácil" | "Medio" | "Difícil" {
  if (readyInMinutes <= 30) return "Fácil"
  if (readyInMinutes <= 60) return "Medio"
  return "Difícil"
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim()
}

async function fetchRecipesFromSpoonacular(
  diet: typeof DIETS[0],
  count: number = 4
): Promise<SpoonacularRecipe[]> {
  const params = new URLSearchParams({
    apiKey: SPOONACULAR_API_KEY,
    number: String(count + 2), // Fetch extra in case some don't have enough info
    addRecipeNutrition: "true",
    addRecipeInstructions: "true",
    fillIngredients: "true",
    instructionsRequired: "true",
  })

  if (diet.spoonacularDiet) {
    params.append("diet", diet.spoonacularDiet)
  }
  if (diet.spoonacularIntolerances) {
    params.append("intolerances", diet.spoonacularIntolerances)
  }
  if ("maxSugar" in diet && diet.maxSugar) {
    params.append("maxSugar", String(diet.maxSugar))
  }

  const response = await fetch(
    `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`
  )

  if (!response.ok) {
    console.error(`Spoonacular API error for ${diet.name}:`, response.status)
    return []
  }

  const data = await response.json()
  const recipeIds = data.results?.map((r: { id: number }) => r.id) || []

  if (recipeIds.length === 0) return []

  // Fetch full recipe details
  const detailsResponse = await fetch(
    `https://api.spoonacular.com/recipes/informationBulk?ids=${recipeIds.join(",")}&includeNutrition=true&apiKey=${SPOONACULAR_API_KEY}`
  )

  if (!detailsResponse.ok) {
    console.error("Failed to fetch recipe details")
    return []
  }

  return detailsResponse.json()
}

// POST /admin/recipes/generate - Generate daily recipes from Spoonacular
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Check authentication via header or query
    const authHeader = req.headers.authorization
    const headerSecret = authHeader?.replace("Bearer ", "")
    const querySecret = req.query.secret as string
    const providedSecret = headerSecret || querySecret

    // Allow both admin auth and cron secret
    const isAdminAuth = (req as any).auth?.actor_id
    const isCronAuth = providedSecret === CRON_SECRET

    if (!isAdminAuth && !isCronAuth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

    console.log("Starting daily recipe generation from Spoonacular...")

    const products = await fetchProducts(req)
    console.log(`Fetched ${products.length} products from store`)

    // Delete old recipes before generating new ones
    const existingRecipes = await recipeModuleService.listRecipes({})
    if (existingRecipes.length > 0) {
      await recipeModuleService.deleteRecipes(existingRecipes.map((r: any) => r.id))
      console.log(`Deleted ${existingRecipes.length} old recipes`)
    }

    const allRecipes: any[] = []

    for (const diet of DIETS) {
      console.log(`Fetching recipes for ${diet.name}...`)
      const spoonacularRecipes = await fetchRecipesFromSpoonacular(diet, 4)

      for (const spRecipe of spoonacularRecipes) {
        if (allRecipes.filter((r) => r.diet === diet.id).length >= 4) break

        // Skip if no instructions
        if (!spRecipe.analyzedInstructions?.[0]?.steps?.length) continue

        // Get ingredient names for matching
        const ingredientNames = spRecipe.extendedIngredients?.map((i) => i.name) || []

        // Find matching products from our store
        const matchedProducts = findMatchingProducts(ingredientNames, products, diet.id)

        // Extract nutrition info
        const nutrients = spRecipe.nutrition?.nutrients || []
        const getNutrient = (name: string) => {
          const n = nutrients.find((x) => x.name.toLowerCase() === name.toLowerCase())
          return Math.round(n?.amount || 0)
        }

        const nutrition: NutritionInfo = {
          calories: getNutrient("Calories"),
          carbs: getNutrient("Carbohydrates"),
          protein: getNutrient("Protein"),
          fat: getNutrient("Fat"),
          fiber: getNutrient("Fiber"),
        }

        // Create recipe in database
        const recipeData = {
          title: spRecipe.title,
          description: stripHtml(spRecipe.summary).slice(0, 200) + "...",
          image: spRecipe.image,
          source_url: spRecipe.sourceUrl,
          diet: diet.id,
          diet_name: diet.name,
          prep_time: `${spRecipe.preparationMinutes || Math.floor(spRecipe.readyInMinutes / 3)} min`,
          cook_time: `${spRecipe.cookingMinutes || Math.floor(spRecipe.readyInMinutes * 2 / 3)} min`,
          servings: spRecipe.servings,
          difficulty: getDifficulty(spRecipe.readyInMinutes),
          ingredients: spRecipe.extendedIngredients?.map((i) => i.original) || [],
          instructions: spRecipe.analyzedInstructions[0]?.steps?.map((s) => s.step) || [],
          products: matchedProducts,
          nutrition,
          tips: null,
          spoonacular_id: spRecipe.id,
          generated_at: new Date(),
        }
        const recipe = await recipeModuleService.createRecipes(recipeData as any)

        allRecipes.push(recipe)
      }

      // Delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    console.log(`Generated ${allRecipes.length} total recipes`)

    res.json({
      success: true,
      count: allRecipes.length,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error generating daily recipes:", error)
    res.status(500).json({ error: "Error generating recipes" })
  }
}

// GET /admin/recipes/generate - Also support GET for cron jobs
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  return POST(req, res)
}
