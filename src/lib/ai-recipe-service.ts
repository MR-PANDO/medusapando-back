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
  baseIngredient?: string
  variants?: Array<{ id: string; calculated_price?: { calculated_amount: number } }>
}

export interface ProductGroup {
  baseIngredient: string
  displayName: string
  primaryProduct: ClassifiedProduct
  alternatives: ClassifiedProduct[]
  count: number
}

// ============================================
// INGREDIENT CATEGORIES - Used for grouping similar products
// ============================================
const INGREDIENT_CATEGORIES: Record<string, string[]> = {
  // Aceites - all olive oils should group together
  "aceite de oliva": ["aceite de oliva", "aceite oliva", "olive oil"],
  "aceite de coco": ["aceite de coco", "aceite coco", "coconut oil"],
  "aceite de aguacate": ["aceite de aguacate", "aceite aguacate", "avocado oil"],

  // Yogurt - all yogurts should group together regardless of flavor
  "yogurt": ["yogurt", "yogur", "yoghurt"],

  // Leches vegetales
  "leche de almendras": ["leche de almendra", "leche almendra", "almond milk"],
  "leche de coco": ["leche de coco", "leche coco", "coconut milk"],
  "leche de avena": ["leche de avena", "leche avena", "oat milk"],

  // Harinas
  "harina de almendras": ["harina de almendra", "harina almendra", "almond flour"],
  "harina de coco": ["harina de coco", "harina coco", "coconut flour"],
  "harina de avena": ["harina de avena", "harina avena", "oat flour"],

  // Mantequillas
  "mantequilla de maní": ["mantequilla de maní", "mantequilla mani", "peanut butter", "crema de maní"],
  "mantequilla de almendras": ["mantequilla de almendra", "almond butter"],

  // Granos y semillas
  "quinoa": ["quinoa", "quinua"],
  "avena": ["avena", "oats", "oatmeal"],
  "arroz": ["arroz", "rice"],
  "chía": ["chia", "chía", "semillas de chia"],
  "linaza": ["linaza", "flaxseed", "semillas de linaza"],

  // Endulzantes
  "miel": ["miel", "honey"],
  "stevia": ["stevia", "estevia"],

  // Proteínas
  "proteína": ["proteina", "proteína", "protein", "whey"],

  // Cacao/Chocolate
  "cacao": ["cacao", "cocoa", "chocolate"],

  // Frutos secos
  "almendras": ["almendra", "almendras", "almond"],
  "nueces": ["nuez", "nueces", "walnut"],
  "maní": ["maní", "mani", "cacahuate", "peanut"],

  // Vinagres
  "vinagre": ["vinagre", "vinegar"],
}

// Products that should NEVER be matched to recipe ingredients
const EXCLUDED_PRODUCTS = [
  "papas", "papa", "chips", "croqueta", "snack",
  "galleta", "cookie", "barra", "bar",
  "jugo", "juice", "bebida energética",
]

// ============================================
// STRICT INGREDIENT MATCHING
// Only match if the product contains the EXACT ingredient
// ============================================
const VALID_INGREDIENT_MATCHES: Record<string, string[]> = {
  // Aceites
  "olive oil": ["aceite de oliva", "aceite oliva"],
  "aceite de oliva": ["aceite de oliva", "aceite oliva", "olive oil"],
  "oil": ["aceite"],
  "aceite": ["aceite"],

  // Yogurt
  "yogurt": ["yogurt", "yogur"],
  "yogur": ["yogurt", "yogur"],

  // Arroz
  "rice": ["arroz"],
  "arroz": ["arroz", "rice"],

  // Frijoles
  "beans": ["frijol", "frijoles"],
  "frijoles": ["frijol", "frijoles"],

  // Honey
  "honey": ["miel"],
  "miel": ["miel", "honey"],

  // Ajo
  "garlic": ["ajo"],
  "ajo": ["ajo", "garlic"],

  // Cebolla
  "onion": ["cebolla"],
  "cebolla": ["cebolla", "onion"],

  // Pimienta (spice, not "papas")
  "black pepper": ["pimienta negra", "pimienta"],
  "pepper": ["pimienta", "pimiento"],
  "pimienta": ["pimienta"],
}

/**
 * Check if a product should be excluded from matching
 */
function shouldExcludeProduct(title: string): boolean {
  const lower = title.toLowerCase()
  return EXCLUDED_PRODUCTS.some(exc => lower.includes(exc))
}

/**
 * Get the base ingredient category for a product
 */
function getIngredientCategory(title: string): string | null {
  const lower = title.toLowerCase()

  for (const [category, keywords] of Object.entries(INGREDIENT_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category
    }
  }

  return null
}

/**
 * Check if a product is a valid match for a recipe ingredient
 */
function isValidIngredientMatch(ingredientName: string, productTitle: string): boolean {
  const lowerIngredient = ingredientName.toLowerCase()
  const lowerProduct = productTitle.toLowerCase()

  // First, check if product should be excluded
  if (shouldExcludeProduct(lowerProduct)) {
    return false
  }

  // Extract key ingredient words from recipe ingredient
  const ingredientWords = lowerIngredient
    .split(/\s+/)
    .filter(w => w.length > 2)

  // Check for valid matches
  for (const word of ingredientWords) {
    const validMatches = VALID_INGREDIENT_MATCHES[word]
    if (validMatches) {
      if (validMatches.some(match => lowerProduct.includes(match))) {
        return true
      }
    }

    // Direct word match (must be exact word, not substring)
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i')
    if (wordRegex.test(lowerProduct)) {
      return true
    }
  }

  return false
}

/**
 * Classify products and extract base ingredients
 */
export async function classifyProducts(
  products: Array<{ id: string; title: string; handle: string; thumbnail?: string; variants?: any[] }>
): Promise<ClassifiedProduct[]> {
  const classified: ClassifiedProduct[] = []

  for (const product of products) {
    // Skip excluded products
    if (shouldExcludeProduct(product.title)) {
      classified.push({
        ...product,
        category: "PREPARED",
      })
      continue
    }

    // Get ingredient category
    const category = getIngredientCategory(product.title)

    if (category) {
      classified.push({
        ...product,
        category: "BASE",
        baseIngredient: category,
      })
    } else {
      classified.push({
        ...product,
        category: "PREPARED",
      })
    }
  }

  return classified
}

/**
 * Group products by their base ingredient
 * All "Aceite de Oliva" products go in one group
 * All "Yogurt" products go in one group (regardless of flavor)
 */
export function deduplicateProducts(products: ClassifiedProduct[]): ProductGroup[] {
  const groups = new Map<string, ClassifiedProduct[]>()

  // Only group BASE products with a baseIngredient
  const baseProducts = products.filter(p => p.category === "BASE" && p.baseIngredient)

  for (const product of baseProducts) {
    const key = product.baseIngredient!

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(product)
  }

  const productGroups: ProductGroup[] = []

  for (const [key, groupProducts] of groups) {
    // Sort by price (cheapest first)
    groupProducts.sort((a, b) => {
      const priceA = a.variants?.[0]?.calculated_price?.calculated_amount || Infinity
      const priceB = b.variants?.[0]?.calculated_price?.calculated_amount || Infinity
      return priceA - priceB
    })

    const primary = groupProducts[0]
    const alternatives = groupProducts.slice(1)

    productGroups.push({
      baseIngredient: key,
      displayName: formatDisplayName(key),
      primaryProduct: primary,
      alternatives,
      count: groupProducts.length,
    })
  }

  return productGroups
}

function formatDisplayName(ingredient: string): string {
  return ingredient
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

/**
 * Find the best product match for a recipe ingredient
 */
function findBestMatch(
  ingredientName: string,
  productGroups: ProductGroup[]
): ProductGroup | null {
  const lowerIngredient = ingredientName.toLowerCase()

  // Direct category match
  for (const group of productGroups) {
    const keywords = INGREDIENT_CATEGORIES[group.baseIngredient] || [group.baseIngredient]

    for (const keyword of keywords) {
      if (lowerIngredient.includes(keyword) || keyword.includes(lowerIngredient)) {
        return group
      }
    }
  }

  // Check valid ingredient matches
  const ingredientWords = lowerIngredient.split(/\s+/).filter(w => w.length > 2)

  for (const word of ingredientWords) {
    const validMatches = VALID_INGREDIENT_MATCHES[word]
    if (validMatches) {
      for (const group of productGroups) {
        const groupKeywords = INGREDIENT_CATEGORIES[group.baseIngredient] || [group.baseIngredient]
        if (validMatches.some(match => groupKeywords.some(gk => gk.includes(match) || match.includes(gk)))) {
          return group
        }
      }
    }
  }

  return null
}

/**
 * Main function: Get smart product matches for recipe ingredients
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
  console.log(`Processing ${allProducts.length} products for ${ingredientNames.length} ingredients...`)

  // Step 1: Classify all products
  const classified = await classifyProducts(allProducts)

  const baseProducts = classified.filter(p => p.category === "BASE")
  const preparedProducts = classified.filter(p => p.category === "PREPARED")

  console.log(`Classified: ${baseProducts.length} BASE, ${preparedProducts.length} PREPARED`)

  // Step 2: Deduplicate to create product groups
  const groups = deduplicateProducts(classified)
  console.log(`Created ${groups.length} product groups: ${groups.map(g => g.baseIngredient).join(", ")}`)

  // Step 3: Match ingredients to product groups (1 product per ingredient category)
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

  const usedCategories = new Set<string>()

  for (const ingredient of ingredientNames) {
    if (selectedProducts.length >= maxProducts) break

    const matchedGroup = findBestMatch(ingredient, groups)

    if (matchedGroup && !usedCategories.has(matchedGroup.baseIngredient)) {
      const primary = matchedGroup.primaryProduct

      if (primary.variants?.[0]) {
        selectedProducts.push({
          id: primary.id,
          variantId: primary.variants[0].id,
          title: primary.title,
          handle: primary.handle,
          thumbnail: primary.thumbnail,
          quantity: "1 unidad",
          price: primary.variants[0].calculated_price?.calculated_amount,
          hasAlternatives: matchedGroup.alternatives.length > 0,
          alternativeCount: matchedGroup.alternatives.length,
        })

        usedCategories.add(matchedGroup.baseIngredient)
        console.log(`  Matched "${ingredient}" -> "${matchedGroup.baseIngredient}" (${matchedGroup.count} options)`)
      }
    }
  }

  console.log(`Selected ${selectedProducts.length} unique products`)

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
