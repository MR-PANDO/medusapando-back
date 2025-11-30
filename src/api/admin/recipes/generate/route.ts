import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { RECIPE_MODULE } from "../../../../modules/recipe"
import RecipeModuleService from "../../../../modules/recipe/service"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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

// Common ingredient translations English <-> Spanish
const INGREDIENT_TRANSLATIONS: Record<string, string[]> = {
  "chicken": ["pollo", "gallina"],
  "beef": ["carne", "res", "ternera"],
  "pork": ["cerdo", "chancho"],
  "fish": ["pescado", "pez"],
  "salmon": ["salmón"],
  "tuna": ["atún"],
  "shrimp": ["camarón", "camarones", "gambas"],
  "egg": ["huevo", "huevos"],
  "eggs": ["huevos", "huevo"],
  "milk": ["leche"],
  "cheese": ["queso"],
  "butter": ["mantequilla"],
  "cream": ["crema", "nata"],
  "yogurt": ["yogur", "yogurt"],
  "tomato": ["tomate"],
  "onion": ["cebolla"],
  "garlic": ["ajo"],
  "pepper": ["pimiento", "pimienta", "ají"],
  "carrot": ["zanahoria"],
  "potato": ["papa", "patata"],
  "spinach": ["espinaca", "espinacas"],
  "broccoli": ["brócoli", "brocoli"],
  "lettuce": ["lechuga"],
  "cucumber": ["pepino"],
  "avocado": ["aguacate", "palta"],
  "corn": ["maíz", "choclo"],
  "beans": ["frijoles", "judías", "porotos"],
  "lentils": ["lentejas"],
  "chickpeas": ["garbanzos"],
  "mushroom": ["champiñón", "hongo", "setas"],
  "apple": ["manzana"],
  "banana": ["banano", "plátano", "guineo"],
  "orange": ["naranja"],
  "lemon": ["limón"],
  "lime": ["lima", "limón verde"],
  "strawberry": ["fresa", "frutilla"],
  "mango": ["mango"],
  "pineapple": ["piña", "ananá"],
  "coconut": ["coco"],
  "rice": ["arroz"],
  "pasta": ["pasta", "fideos"],
  "bread": ["pan"],
  "flour": ["harina"],
  "oats": ["avena"],
  "quinoa": ["quinoa", "quinua"],
  "almond": ["almendra", "almendras"],
  "walnut": ["nuez", "nueces"],
  "peanut": ["maní", "cacahuate"],
  "chia": ["chía"],
  "flax": ["linaza"],
  "oil": ["aceite"],
  "olive": ["oliva", "aceituna"],
  "sugar": ["azúcar"],
  "honey": ["miel"],
  "stevia": ["stevia", "estevia"],
  "salt": ["sal"],
  "vinegar": ["vinagre"],
  "soy": ["soya", "soja"],
  "tofu": ["tofu"],
  "chocolate": ["chocolate", "cacao"],
  "coffee": ["café"],
  "tea": ["té"],
  "cinnamon": ["canela"],
  "ginger": ["jengibre"],
  "turmeric": ["cúrcuma"],
  "protein": ["proteína", "proteina"],
  "powder": ["polvo"],
  "supplement": ["suplemento"],
  "vitamin": ["vitamina"],
  "organic": ["orgánico", "organico"],
  "gluten": ["gluten"],
  "vegan": ["vegano"],
}

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

async function fetchProducts(req: MedusaRequest): Promise<Product[]> {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "tags.*", "variants.*"],
    pagination: { take: 200 },
  })

  return products as unknown as Product[]
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

// Words that indicate a processed product (should not match raw ingredients)
const PROCESSED_PRODUCT_KEYWORDS = [
  "croqueta", "croquetas", "jugo", "juice", "bebida", "drink",
  "galleta", "galletas", "cookie", "cookies", "snack", "snacks",
  "chip", "chips", "papas fritas", "arepa", "arepas", "empanada",
  "preparado", "preparada", "listo", "lista", "instantáneo", "instantanea",
  "polvo", "powder", "mezcla", "mix", "concentrado", "concentrate",
  "barra", "barrita", "bar", "granola bar", "cereal bar",
  "helado", "ice cream", "postre", "dessert", "torta", "cake",
  "pan ", "bread", "panadería", "bakery", "pastel", "pastry",
  "salsa embotellada", "bottled sauce", "aderezo", "dressing",
  "congelado", "frozen", "precocido", "precooked", "enlatado", "canned",
  "sabor", "flavor", "saborizante", "flavoring", "artificial",
]

// Base ingredients that are valid to match (raw/whole foods)
const BASE_INGREDIENT_KEYWORDS = [
  "aceite", "oil", "vinagre", "vinegar", "sal", "salt", "azúcar", "sugar",
  "miel", "honey", "especias", "spice", "hierba", "herb",
  "harina", "flour", "arroz", "rice", "pasta", "fideos", "noodles",
  "frijol", "frijoles", "beans", "lenteja", "lentejas", "lentils",
  "garbanzo", "garbanzos", "chickpeas", "quinoa", "quinua", "avena", "oats",
  "almendra", "almendras", "almond", "nuez", "nueces", "walnut", "nut",
  "maní", "cacahuate", "peanut", "semilla", "seed", "chía", "chia", "linaza", "flax",
  "coco", "coconut", "cacao", "chocolate puro", "pure chocolate",
  "tofu", "tempeh", "soya", "soja", "soy",
  "proteína", "proteina", "protein", "suplemento", "supplement",
  "vitamina", "vitamin", "omega", "colágeno", "collagen",
  "stevia", "eritritol", "endulzante natural", "natural sweetener",
  "leche vegetal", "plant milk", "leche de almendra", "almond milk",
  "leche de coco", "coconut milk", "leche de avena", "oat milk",
  "mantequilla de maní", "peanut butter", "mantequilla de almendra", "almond butter",
  "tahini", "hummus",
  // Vegetables
  "esparrago", "espárragos", "asparagus", "espinaca", "spinach",
  "brocoli", "brócoli", "broccoli", "coliflor", "cauliflower",
  "zanahoria", "carrot", "apio", "celery", "pepino", "cucumber",
  "tomate", "tomato", "cebolla", "onion", "ajo", "garlic",
  "pimiento", "pepper", "chile", "chili", "limón", "lemon", "lima", "lime",
  "aguacate", "avocado", "palta", "lechuga", "lettuce", "repollo", "cabbage",
  "calabaza", "pumpkin", "squash", "berenjena", "eggplant", "champiñón", "mushroom",
]

// Get search terms for an ingredient (original + translations)
function getSearchTerms(ingredient: string): string[] {
  const terms: string[] = []
  const lowerIngredient = ingredient.toLowerCase()
  const words = lowerIngredient.split(/\s+/).filter(w => w.length > 3)
  terms.push(...words)

  for (const word of words) {
    if (INGREDIENT_TRANSLATIONS[word]) {
      terms.push(...INGREDIENT_TRANSLATIONS[word])
    }
    for (const [english, spanish] of Object.entries(INGREDIENT_TRANSLATIONS)) {
      if (spanish.some(s => s.includes(word) || word.includes(s))) {
        terms.push(english)
      }
    }
  }

  return [...new Set(terms)]
}

// Check if a product is a processed food (should not match raw ingredients)
function isProcessedProduct(productTitle: string): boolean {
  const lowerTitle = productTitle.toLowerCase()
  return PROCESSED_PRODUCT_KEYWORDS.some(keyword => lowerTitle.includes(keyword))
}

// Check if product is a base ingredient match (raw/whole foods store sells)
function isBaseIngredientProduct(productTitle: string): boolean {
  const lowerTitle = productTitle.toLowerCase()
  return BASE_INGREDIENT_KEYWORDS.some(keyword => lowerTitle.includes(keyword))
}

// Calculate match quality between ingredient and product
function calculateMatchQuality(ingredientTerms: string[], productTitle: string): number {
  const lowerTitle = productTitle.toLowerCase()
  let score = 0

  for (const term of ingredientTerms) {
    if (term.length < 3) continue

    // Exact word match (higher score)
    const wordRegex = new RegExp(`\\b${term}\\b`, 'i')
    if (wordRegex.test(lowerTitle)) {
      score += 3
    }
    // Partial match (lower score)
    else if (lowerTitle.includes(term)) {
      score += 1
    }
  }

  return score
}

function findMatchingProducts(
  ingredientNames: string[],
  products: Product[],
  dietIds: string[]
): RecipeProduct[] {
  const matchedProducts: RecipeProduct[] = []
  const usedProductIds = new Set<string>()

  // Filter to only base ingredient products (exclude processed foods)
  const baseIngredientProducts = products.filter(p => {
    const title = p.title.toLowerCase()
    // Must be a base ingredient AND not a processed product
    return isBaseIngredientProduct(title) && !isProcessedProduct(title)
  })

  // Filter to diet-compatible base ingredients
  const dietProducts = baseIngredientProducts.filter((p) => {
    const tags = p.tags?.map((t) => t.value.toLowerCase()) || []
    return dietIds.some(dietId => tags.includes(dietId.toLowerCase()))
  })

  // Score all potential matches for each ingredient
  interface PotentialMatch {
    product: Product
    ingredientName: string
    score: number
  }

  const allPotentialMatches: PotentialMatch[] = []

  for (const ingredientName of ingredientNames) {
    const searchTerms = getSearchTerms(ingredientName)

    // Search in diet products first, then all base ingredient products
    const searchPools = [dietProducts, baseIngredientProducts]

    for (const pool of searchPools) {
      for (const product of pool) {
        if (usedProductIds.has(product.id)) continue

        const score = calculateMatchQuality(searchTerms, product.title)

        // Only consider matches with score >= 3 (at least one exact word match)
        if (score >= 3 && product.variants?.[0]) {
          allPotentialMatches.push({
            product,
            ingredientName,
            score,
          })
        }
      }
    }
  }

  // Sort by score (highest first) and pick the best matches
  allPotentialMatches.sort((a, b) => b.score - a.score)

  for (const match of allPotentialMatches) {
    if (usedProductIds.has(match.product.id)) continue

    matchedProducts.push({
      id: match.product.id,
      variantId: match.product.variants![0].id,
      title: match.product.title,
      handle: match.product.handle,
      thumbnail: match.product.thumbnail,
      quantity: "1 unidad",
      price: (match.product.variants![0] as any).calculated_price?.calculated_amount,
    })
    usedProductIds.add(match.product.id)

    if (matchedProducts.length >= 4) {
      break
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

// Fetch diet-specific recipes to ensure variety
async function fetchDietSpecificRecipes(): Promise<SpoonacularRecipe[]> {
  const allRecipes: SpoonacularRecipe[] = []
  const seenIds = new Set<number>()

  for (const diet of DIETS) {
    if (!diet.spoonacularDiet && !diet.spoonacularIntolerances) continue

    const params = new URLSearchParams({
      apiKey: SPOONACULAR_API_KEY,
      number: "6",
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

// POST /admin/recipes/generate - Generate daily recipes from Spoonacular
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const authHeader = req.headers.authorization
    const headerSecret = authHeader?.replace("Bearer ", "")
    const querySecret = req.query.secret as string
    const providedSecret = headerSecret || querySecret

    const isAdminAuth = (req as any).auth?.actor_id
    const isCronAuth = providedSecret === CRON_SECRET

    if (!isAdminAuth && !isCronAuth) {
      return res.status(401).json({ error: "Unauthorized" })
    }

    const recipeModuleService: RecipeModuleService = req.scope.resolve(RECIPE_MODULE)

    console.log("Starting daily recipe generation from Spoonacular...")

    const products = await fetchProducts(req)
    console.log(`Fetched ${products.length} products from store`)

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

    // Deduplicate and filter out existing
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

    console.log(`Processing ${uniqueRecipes.size} new unique recipes...`)

    // If we have enough recipes, don't delete. Only delete if refreshing all.
    const shouldRefresh = existingRecipes.length === 0 || uniqueRecipes.size >= 20

    if (shouldRefresh && existingRecipes.length > 0) {
      // Delete old recipes if doing a full refresh
      await recipeModuleService.deleteRecipes(existingRecipes.map((r: any) => r.id))
      console.log(`Deleted ${existingRecipes.length} old recipes for refresh`)
    }

    const allRecipes: any[] = []
    let translatedCount = 0

    for (const [spoonacularId, spRecipe] of uniqueRecipes) {
      if (allRecipes.length >= 30) break

      const { ids: dietIds, names: dietNames } = getCompatibleDiets(spRecipe)
      const ingredientNames = spRecipe.extendedIngredients?.map((i) => i.name) || []
      const matchedProducts = findMatchingProducts(ingredientNames, products, dietIds)

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
      translatedCount++

      if (translatedCount % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Create recipe in database
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
        products: matchedProducts,
        nutrition,
        tips: translated.tips || null,
        spoonacular_id: spoonacularId,
        generated_at: new Date(),
      }

      const recipe = await recipeModuleService.createRecipes(recipeData as any)
      allRecipes.push(recipe)
    }

    console.log(`Generated ${allRecipes.length} unique translated recipes`)

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
