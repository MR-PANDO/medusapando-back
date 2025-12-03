import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../modules/recipe"
import RecipeModuleService from "../../../../modules/recipe/service"
import Anthropic from "@anthropic-ai/sdk"

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY || ""
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ""
const CRON_SECRET = process.env.CRON_SECRET || process.env.REVALIDATE_SECRET || ""

// Diet definitions with Spoonacular mappings
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
  vegan?: boolean
  vegetarian?: boolean
  glutenFree?: boolean
  dairyFree?: boolean
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

// Determine which diets a recipe is compatible with
function getCompatibleDiets(recipe: SpoonacularRecipe): { ids: string[], names: string[] } {
  const ids: string[] = []
  const names: string[] = []

  if (recipe.vegan) {
    ids.push("vegano")
    names.push("Vegano")
  }
  if (recipe.vegetarian && !recipe.vegan) {
    ids.push("vegetariano")
    names.push("Vegetariano")
  }
  if (recipe.glutenFree) {
    ids.push("sin-gluten")
    names.push("Sin Gluten")
  }
  if (recipe.dairyFree) {
    ids.push("sin-lactosa")
    names.push("Sin Lactosa")
  }

  const nutrients = recipe.nutrition?.nutrients || []
  const carbs = nutrients.find(n => n.name.toLowerCase() === "carbohydrates")?.amount || 0
  const fat = nutrients.find(n => n.name.toLowerCase() === "fat")?.amount || 0
  const sugar = nutrients.find(n => n.name.toLowerCase() === "sugar")?.amount || 0

  if (carbs < 20 && fat > 15) {
    ids.push("keto")
    names.push("Keto")
  }

  if (sugar < 5) {
    ids.push("sin-azucar")
    names.push("Sin Azúcar")
  }

  if (ids.length === 0) {
    ids.push("saludable")
    names.push("Saludable")
  }

  return { ids, names }
}

function getDifficulty(readyInMinutes: number): "Fácil" | "Medio" | "Difícil" {
  if (readyInMinutes <= 30) return "Fácil"
  if (readyInMinutes <= 60) return "Medio"
  return "Difícil"
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[^;]+;/g, " ").trim()
}

// Translate recipe content to Spanish using Claude
async function translateRecipeToSpanish(recipe: {
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
}): Promise<{
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  tips?: string
}> {
  if (!ANTHROPIC_API_KEY) {
    console.log("No Anthropic API key, skipping translation")
    return { ...recipe }
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Traduce esta receta al español colombiano de forma natural y fluida. Responde SOLO con JSON válido, sin explicaciones adicionales.

Receta en inglés:
- Título: ${recipe.title}
- Descripción: ${recipe.description}
- Ingredientes: ${JSON.stringify(recipe.ingredients)}
- Instrucciones: ${JSON.stringify(recipe.instructions)}

Responde con este formato JSON exacto:
{
  "title": "título traducido",
  "description": "descripción traducida (máximo 200 caracteres)",
  "ingredients": ["ingrediente 1", "ingrediente 2", ...],
  "instructions": ["paso 1", "paso 2", ...],
  "tips": "un consejo útil opcional para esta receta"
}`
        }
      ]
    })

    const content = response.content[0]
    if (content.type === "text") {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const translated = JSON.parse(jsonMatch[0])
        return {
          title: translated.title || recipe.title,
          description: translated.description || recipe.description,
          ingredients: translated.ingredients || recipe.ingredients,
          instructions: translated.instructions || recipe.instructions,
          tips: translated.tips,
        }
      }
    }
  } catch (error) {
    console.error("Translation error:", error)
  }

  return { ...recipe }
}

// Fetch diet-specific recipes from Spoonacular
async function fetchDietSpecificRecipes(): Promise<SpoonacularRecipe[]> {
  const allRecipes: SpoonacularRecipe[] = []
  const seenIds = new Set<number>()

  for (const diet of DIETS) {
    if (!diet.spoonacularDiet && !diet.spoonacularIntolerances) continue

    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      number: "4", // Fewer per diet to stay within limits
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

    try {
      const response = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?${params.toString()}`
      )

      if (!response.ok) continue

      const data = await response.json()
      const recipeIds = data.results?.map((r: { id: number }) => r.id).filter((id: number) => !seenIds.has(id)) || []

      if (recipeIds.length === 0) continue

      recipeIds.forEach((id: number) => seenIds.add(id))

      const detailsResponse = await fetch(
        `https://api.spoonacular.com/recipes/informationBulk?ids=${recipeIds.join(",")}&includeNutrition=true&apiKey=${SPOONACULAR_API_KEY}`
      )

      if (detailsResponse.ok) {
        const recipes = await detailsResponse.json()
        allRecipes.push(...recipes)
      }

      await new Promise(resolve => setTimeout(resolve, 300))
    } catch (error) {
      console.error(`Error fetching ${diet.name} recipes:`, error)
    }
  }

  return allRecipes
}

// POST /store/recipes/generate - Generate recipes from Spoonacular (for cron jobs)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    // Validate secret for cron authentication
    const authHeader = req.headers.authorization
    const headerSecret = authHeader?.replace("Bearer ", "")
    const querySecret = req.query.secret as string
    const providedSecret = headerSecret || querySecret

    if (!providedSecret || providedSecret !== CRON_SECRET) {
      return res.status(401).json({ error: "Unauthorized - Invalid or missing secret" })
    }

    const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

    console.log("Starting recipe generation from Spoonacular (cron)...")

    // Get existing spoonacular IDs to avoid duplicates
    const existingRecipes = await recipeModuleService.listRecipes({})
    const existingSpoonacularIds = new Set(
      existingRecipes.map((r: any) => r.spoonacular_id).filter(Boolean)
    )
    console.log(`Found ${existingSpoonacularIds.size} existing recipes in database`)

    // Fetch recipes from Spoonacular
    console.log("Fetching diet-specific recipes from Spoonacular...")
    const spoonacularRecipes = await fetchDietSpecificRecipes()
    console.log(`Fetched ${spoonacularRecipes.length} recipes from Spoonacular`)

    // Filter out existing recipes (by spoonacular_id)
    const uniqueRecipes = new Map<number, SpoonacularRecipe>()
    for (const recipe of spoonacularRecipes) {
      if (
        !uniqueRecipes.has(recipe.id) &&
        !existingSpoonacularIds.has(recipe.id) &&
        recipe.analyzedInstructions?.[0]?.steps?.length
      ) {
        uniqueRecipes.set(recipe.id, recipe)
      }
    }

    console.log(`Found ${uniqueRecipes.size} new unique recipes`)

    if (uniqueRecipes.size === 0) {
      console.log("No new recipes to add.")
      return res.json({
        success: true,
        count: 0,
        existingCount: existingRecipes.length,
        message: "No new recipes found - all fetched recipes already exist",
        generatedAt: new Date().toISOString(),
      })
    }

    const createdRecipes: any[] = []

    // Limit to 10 new recipes per run
    const maxNewRecipes = 10
    let processedCount = 0

    for (const [spoonacularId, spRecipe] of uniqueRecipes) {
      if (processedCount >= maxNewRecipes) break

      const { ids: dietIds, names: dietNames } = getCompatibleDiets(spRecipe)

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

      // Translate to Spanish
      console.log(`Translating: ${spRecipe.title}...`)
      const translated = await translateRecipeToSpanish({
        title: spRecipe.title,
        description: stripHtml(spRecipe.summary).slice(0, 300),
        ingredients: spRecipe.extendedIngredients?.map((i) => i.original) || [],
        instructions: spRecipe.analyzedInstructions[0]?.steps?.map((s) => s.step) || [],
      })

      // Rate limiting for translation API
      if (processedCount > 0 && processedCount % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Create recipe as DRAFT (no products assigned yet)
      const recipeData = {
        title: translated.title,
        description: translated.description.slice(0, 200) + (translated.description.length > 200 ? "..." : ""),
        image: spRecipe.image,
        source_url: spRecipe.sourceUrl,
        diets: dietIds,
        diet_names: dietNames,
        prep_time: `${spRecipe.preparationMinutes || Math.floor(spRecipe.readyInMinutes / 3)} min`,
        cook_time: `${spRecipe.cookingMinutes || Math.floor(spRecipe.readyInMinutes * 2 / 3)} min`,
        servings: spRecipe.servings,
        difficulty: getDifficulty(spRecipe.readyInMinutes),
        ingredients: translated.ingredients,
        instructions: translated.instructions,
        nutrition,
        tips: translated.tips || null,
        spoonacular_id: spoonacularId,
        generated_at: new Date(),
        status: "draft", // New recipes start as draft
      }

      const recipe = await recipeModuleService.createRecipes(recipeData as any)
      createdRecipes.push(recipe)
      processedCount++
    }

    const totalRecipes = existingRecipes.length + createdRecipes.length
    console.log(`Added ${createdRecipes.length} new draft recipes. Total in database: ${totalRecipes}`)

    res.json({
      success: true,
      count: createdRecipes.length,
      totalRecipes,
      existingCount: existingRecipes.length,
      message: `Added ${createdRecipes.length} new recipes as drafts. Assign products in admin panel to publish.`,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error generating recipes:", error)
    res.status(500).json({ error: "Error generating recipes" })
  }
}

// GET /store/recipes/generate - Also support GET for cron jobs
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  return POST(req, res)
}
