import Anthropic from "@anthropic-ai/sdk"

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ""

// Product classification types
export type ProductCategory = "BASE" | "PREPARED" | "UNKNOWN"

export interface ClassifiedProduct {
  id: string
  title: string
  handle: string
  thumbnail?: string
  category: ProductCategory
  baseIngredient?: string // e.g., "olive oil" for "Aceite de Oliva Extra Virgen 500ml"
  variants?: Array<{ id: string; calculated_price?: { calculated_amount: number } }>
}

export interface ProductGroup {
  baseIngredient: string
  displayName: string
  primaryProduct: ClassifiedProduct
  alternatives: ClassifiedProduct[]
  count: number
}

export interface IngredientRecommendation {
  ingredientName: string
  matchedGroup: ProductGroup | null
  confidence: number
  reason: string
}

// Keywords for quick classification (before using AI)
const PROCESSED_KEYWORDS = [
  "croqueta", "croquetas", "jugo", "juice", "bebida", "drink",
  "galleta", "galletas", "cookie", "cookies", "snack", "snacks",
  "chip", "chips", "papas fritas", "arepa", "arepas", "empanada",
  "preparado", "preparada", "listo", "lista", "instantáneo",
  "barra", "barrita", "bar", "cereal bar", "granola bar",
  "helado", "ice cream", "postre", "dessert", "torta", "cake",
  "panadería", "bakery", "pastel", "pastry",
  "congelado", "frozen", "precocido", "precooked",
  "saborizante", "artificial", "procesado",
]

const BASE_KEYWORDS = [
  "aceite", "oil", "vinagre", "vinegar", "sal", "salt",
  "harina", "flour", "arroz", "rice", "quinoa", "quinua",
  "avena", "oats", "frijol", "beans", "lenteja", "lentejas",
  "garbanzo", "chickpeas", "almendra", "almond", "nuez", "walnut",
  "maní", "peanut", "semilla", "seed", "chía", "chia",
  "coco", "coconut", "cacao", "chocolate", "tofu", "tempeh",
  "proteína", "protein", "suplemento", "supplement",
  "miel", "honey", "stevia", "endulzante",
  "leche", "milk", "mantequilla", "butter",
  "espinaca", "spinach", "brócoli", "broccoli", "zanahoria", "carrot",
  "tomate", "tomato", "cebolla", "onion", "ajo", "garlic",
  "aguacate", "avocado", "lechuga", "lettuce",
]

/**
 * Quick classification using keywords (no API call needed)
 */
function quickClassify(title: string): ProductCategory {
  const lower = title.toLowerCase()

  if (PROCESSED_KEYWORDS.some(kw => lower.includes(kw))) {
    return "PREPARED"
  }

  if (BASE_KEYWORDS.some(kw => lower.includes(kw))) {
    return "BASE"
  }

  return "UNKNOWN"
}

/**
 * AI-powered product classifier that categorizes products as BASE or PREPARED
 * and extracts the base ingredient name for grouping
 */
export async function classifyProducts(
  products: Array<{ id: string; title: string; handle: string; thumbnail?: string; variants?: any[] }>
): Promise<ClassifiedProduct[]> {
  const classified: ClassifiedProduct[] = []

  // First pass: quick classification
  const unknownProducts: typeof products = []

  for (const product of products) {
    const category = quickClassify(product.title)

    if (category !== "UNKNOWN") {
      classified.push({
        ...product,
        category,
        baseIngredient: category === "BASE" ? extractBaseIngredient(product.title) : undefined,
      })
    } else {
      unknownProducts.push(product)
    }
  }

  // If no Anthropic key or no unknown products, return early
  if (!ANTHROPIC_API_KEY || unknownProducts.length === 0) {
    // Mark unknowns as PREPARED (safer default for food store)
    for (const product of unknownProducts) {
      classified.push({
        ...product,
        category: "PREPARED",
      })
    }
    return classified
  }

  // Second pass: use Claude for ambiguous products (batch of max 20)
  const batchSize = 20
  for (let i = 0; i < unknownProducts.length; i += batchSize) {
    const batch = unknownProducts.slice(i, i + batchSize)

    try {
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

      const productList = batch.map((p, idx) => `${idx + 1}. ${p.title}`).join("\n")

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `Clasifica estos productos de una tienda de alimentos saludables.
Para cada producto, determina:
1. Categoría: "BASE" (ingrediente natural/crudo como aceites, harinas, granos, vegetales frescos, proteínas) o "PREPARED" (producto procesado/listo para consumir como galletas, jugos, snacks)
2. Ingrediente base: solo para productos BASE, el ingrediente principal (ej: "aceite de oliva", "quinoa", "almendras")

Productos:
${productList}

Responde SOLO con JSON válido en este formato:
[
  {"index": 1, "category": "BASE", "baseIngredient": "aceite de oliva"},
  {"index": 2, "category": "PREPARED", "baseIngredient": null}
]`
        }]
      })

      const content = response.content[0]
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const results = JSON.parse(jsonMatch[0])

          for (const result of results) {
            const product = batch[result.index - 1]
            if (product) {
              classified.push({
                ...product,
                category: result.category === "BASE" ? "BASE" : "PREPARED",
                baseIngredient: result.baseIngredient || undefined,
              })
            }
          }
        }
      }
    } catch (error) {
      console.error("AI classification error:", error)
      // Fallback: mark as PREPARED
      for (const product of batch) {
        classified.push({
          ...product,
          category: "PREPARED",
        })
      }
    }
  }

  return classified
}

/**
 * Extract base ingredient from product title using patterns
 */
function extractBaseIngredient(title: string): string {
  const lower = title.toLowerCase()

  // Common patterns: "Aceite de X", "Harina de X", "Leche de X"
  const patterns = [
    /aceite\s+de\s+(\w+)/i,
    /harina\s+de\s+(\w+)/i,
    /leche\s+de\s+(\w+)/i,
    /mantequilla\s+de\s+(\w+)/i,
    /proteína\s+de\s+(\w+)/i,
    /semillas?\s+de\s+(\w+)/i,
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match) {
      return match[0]
    }
  }

  // Return first significant words (remove brand names, sizes)
  const words = lower
    .replace(/\d+\s*(g|kg|ml|l|oz|lb)\b/gi, "") // Remove sizes
    .replace(/\b(orgánico|organico|organic|natural|premium|extra|virgen)\b/gi, "") // Remove modifiers
    .split(/\s+/)
    .filter(w => w.length > 2)
    .slice(0, 3)
    .join(" ")
    .trim()

  return words || lower
}

/**
 * Group products by their base ingredient to avoid showing duplicates
 * Returns 1 primary product per group with alternatives hidden
 */
export function deduplicateProducts(products: ClassifiedProduct[]): ProductGroup[] {
  const groups = new Map<string, ClassifiedProduct[]>()

  // Only group BASE products
  const baseProducts = products.filter(p => p.category === "BASE" && p.baseIngredient)

  for (const product of baseProducts) {
    const key = normalizeIngredientKey(product.baseIngredient!)

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(product)
  }

  const productGroups: ProductGroup[] = []

  for (const [key, groupProducts] of groups) {
    // Sort by price (cheapest first) or by title length (shorter = simpler)
    groupProducts.sort((a, b) => {
      const priceA = a.variants?.[0]?.calculated_price?.calculated_amount || Infinity
      const priceB = b.variants?.[0]?.calculated_price?.calculated_amount || Infinity
      return priceA - priceB
    })

    const primary = groupProducts[0]
    const alternatives = groupProducts.slice(1)

    productGroups.push({
      baseIngredient: key,
      displayName: formatDisplayName(primary.baseIngredient!),
      primaryProduct: primary,
      alternatives,
      count: groupProducts.length,
    })
  }

  return productGroups
}

/**
 * Normalize ingredient name for grouping
 */
function normalizeIngredientKey(ingredient: string): string {
  return ingredient
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/\s+/g, "_")
    .trim()
}

/**
 * Format display name for UI
 */
function formatDisplayName(ingredient: string): string {
  return ingredient
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * AI-powered recommendation engine that matches recipe ingredients
 * to the best available products in the store
 */
export async function recommendProducts(
  ingredientNames: string[],
  productGroups: ProductGroup[],
  dietFilters: string[] = []
): Promise<IngredientRecommendation[]> {
  const recommendations: IngredientRecommendation[] = []

  // Quick matching first
  for (const ingredient of ingredientNames) {
    const lowerIngredient = ingredient.toLowerCase()

    // Find matching product group
    let bestMatch: ProductGroup | null = null
    let bestScore = 0

    for (const group of productGroups) {
      const score = calculateMatchScore(lowerIngredient, group.baseIngredient)
      if (score > bestScore && score >= 0.5) {
        bestScore = score
        bestMatch = group
      }
    }

    recommendations.push({
      ingredientName: ingredient,
      matchedGroup: bestMatch,
      confidence: bestScore,
      reason: bestMatch
        ? `Matched "${bestMatch.displayName}" with ${Math.round(bestScore * 100)}% confidence`
        : "No matching product found",
    })
  }

  // Use AI for low-confidence matches
  const lowConfidenceMatches = recommendations.filter(r => r.confidence < 0.7 && r.matchedGroup === null)

  if (ANTHROPIC_API_KEY && lowConfidenceMatches.length > 0 && productGroups.length > 0) {
    try {
      const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

      const ingredientList = lowConfidenceMatches.map(r => r.ingredientName).join(", ")
      const productList = productGroups.slice(0, 30).map(g => g.displayName).join(", ")

      const response = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Eres un asistente de cocina. Para cada ingrediente de receta, sugiere cuál producto de la tienda sería el mejor sustituto o equivalente.

Ingredientes que necesito: ${ingredientList}

Productos disponibles en la tienda: ${productList}

Responde SOLO con JSON:
[
  {"ingredient": "nombre ingrediente", "product": "nombre producto exacto de la lista o null si no hay match", "reason": "breve explicación"}
]`
        }]
      })

      const content = response.content[0]
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const results = JSON.parse(jsonMatch[0])

          for (const result of results) {
            const rec = recommendations.find(r =>
              r.ingredientName.toLowerCase() === result.ingredient?.toLowerCase()
            )

            if (rec && result.product) {
              const matchedGroup = productGroups.find(g =>
                g.displayName.toLowerCase() === result.product.toLowerCase()
              )

              if (matchedGroup) {
                rec.matchedGroup = matchedGroup
                rec.confidence = 0.8
                rec.reason = result.reason || "AI recommendation"
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("AI recommendation error:", error)
    }
  }

  return recommendations
}

/**
 * Calculate match score between ingredient and product group
 */
function calculateMatchScore(ingredient: string, productBase: string): number {
  const ingredientWords = ingredient.split(/\s+/).filter(w => w.length > 2)
  const productWords = productBase.split(/[_\s]+/).filter(w => w.length > 2)

  let matches = 0
  let total = ingredientWords.length

  for (const iWord of ingredientWords) {
    for (const pWord of productWords) {
      if (iWord === pWord || iWord.includes(pWord) || pWord.includes(iWord)) {
        matches++
        break
      }
    }
  }

  return total > 0 ? matches / total : 0
}

/**
 * Get the best products for a recipe, using classification, deduplication, and recommendations
 */
export async function getSmartProductMatches(
  ingredientNames: string[],
  allProducts: Array<{ id: string; title: string; handle: string; thumbnail?: string; tags?: Array<{ value: string }>; variants?: any[] }>,
  dietIds: string[],
  maxProducts: number = 4
): Promise<{
  products: Array<{
    id: string
    variantId: string
    title: string
    handle: string
    thumbnail?: string
    quantity: string
    price?: number
    hasAlternatives: boolean
    alternativeCount: number
  }>
  stats: {
    totalProducts: number
    baseProducts: number
    preparedProducts: number
    groupsCreated: number
  }
}> {
  // Step 1: Classify all products
  console.log(`Classifying ${allProducts.length} products...`)
  const classified = await classifyProducts(allProducts)

  const baseProducts = classified.filter(p => p.category === "BASE")
  const preparedProducts = classified.filter(p => p.category === "PREPARED")

  console.log(`Classified: ${baseProducts.length} BASE, ${preparedProducts.length} PREPARED`)

  // Step 2: Deduplicate to create product groups
  const groups = deduplicateProducts(classified)
  console.log(`Created ${groups.length} product groups`)

  // Step 3: Get recommendations for ingredients
  const recommendations = await recommendProducts(ingredientNames, groups, dietIds)

  // Step 4: Build final product list
  const selectedProducts: Array<{
    id: string
    variantId: string
    title: string
    handle: string
    thumbnail?: string
    quantity: string
    price?: number
    hasAlternatives: boolean
    alternativeCount: number
  }> = []

  const usedGroupIds = new Set<string>()

  for (const rec of recommendations) {
    if (selectedProducts.length >= maxProducts) break
    if (!rec.matchedGroup) continue
    if (usedGroupIds.has(rec.matchedGroup.baseIngredient)) continue

    const primary = rec.matchedGroup.primaryProduct

    if (primary.variants?.[0]) {
      selectedProducts.push({
        id: primary.id,
        variantId: primary.variants[0].id,
        title: primary.title,
        handle: primary.handle,
        thumbnail: primary.thumbnail,
        quantity: "1 unidad",
        price: primary.variants[0].calculated_price?.calculated_amount,
        hasAlternatives: rec.matchedGroup.alternatives.length > 0,
        alternativeCount: rec.matchedGroup.alternatives.length,
      })

      usedGroupIds.add(rec.matchedGroup.baseIngredient)
    }
  }

  return {
    products: selectedProducts,
    stats: {
      totalProducts: allProducts.length,
      baseProducts: baseProducts.length,
      preparedProducts: preparedProducts.length,
      groupsCreated: groups.length,
    }
  }
}
