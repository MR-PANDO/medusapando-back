import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Middleware that extends admin product search to also match variant SKUs.
 * When `q` is present, it searches both product titles and variant SKUs,
 * then combines results using an `id` filter.
 */
export async function skuSearchMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const q = (req.query.q as string | undefined)?.trim()
  if (!q || q.length < 1) return next()

  console.log("[SKU Search] Searching for:", q)

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any

    // Search variants by SKU (case-insensitive partial match)
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product.id"],
      filters: { sku: { $ilike: `%${q}%` } },
    })

    console.log("[SKU Search] Variant matches:", variants.length)

    // Also search products by title
    const { data: titleProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { title: { $ilike: `%${q}%` } },
    })

    const { data: handleProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { handle: { $ilike: `%${q}%` } },
    })

    const skuProductIds = variants
      .map((v: any) => v.product?.id)
      .filter(Boolean)

    const titleProductIds = [
      ...titleProducts.map((p: any) => p.id),
      ...handleProducts.map((p: any) => p.id),
    ]

    // Merge both sets
    const allIds = [...new Set([...skuProductIds, ...titleProductIds])]

    console.log("[SKU Search] Total product IDs found:", allIds.length, "SKU:", skuProductIds.length, "Title:", titleProducts.length, "Handle:", handleProducts.length)

    if (allIds.length > 0) {
      // Replace q with id filter so both SKU and title matches appear
      req.query.id = allIds
      delete req.query.q
      console.log("[SKU Search] Replaced q with", allIds.length, "product IDs")
    } else {
      console.log("[SKU Search] No matches found, letting default q handler proceed")
    }
  } catch (err: any) {
    // If SKU search fails, let the normal q handler proceed
    console.warn("[SKU Search] Middleware error:", err.message)
  }

  next()
}
