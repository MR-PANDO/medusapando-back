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
  const q = req.query.q as string | undefined
  if (!q || q.length < 1) return next()

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any

    // Search variants by SKU (case-insensitive partial match)
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "product.id"],
      filters: { sku: { $ilike: `%${q}%` } },
    })

    if (variants.length === 0) {
      // No SKU matches — let the default q search handle it
      return next()
    }

    const skuProductIds = [
      ...new Set(
        variants
          .map((v: any) => v.product?.id)
          .filter(Boolean)
      ),
    ] as string[]

    // Also search products by title so we keep OR semantics
    const { data: titleProducts } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: {
        $or: [
          { title: { $ilike: `%${q}%` } },
          { handle: { $ilike: `%${q}%` } },
        ],
      },
    })

    const titleProductIds = titleProducts.map((p: any) => p.id)

    // Merge both sets
    const allIds = [...new Set([...skuProductIds, ...titleProductIds])]

    if (allIds.length > 0) {
      // Replace q with id filter so both SKU and title matches appear
      req.query.id = allIds
      delete req.query.q
    }
  } catch (err: any) {
    // If SKU search fails, let the normal q handler proceed
    console.warn("[SKU Search] Middleware error:", err.message)
  }

  next()
}
