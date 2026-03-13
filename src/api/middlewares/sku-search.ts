import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Middleware that extends admin product search to also match variant SKUs.
 * Runs AFTER validateAndTransformQuery, so it modifies req.filterableFields
 * (not req.query) to inject product IDs matched by SKU.
 */
export async function skuSearchMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const filterableFields = (req as any).filterableFields
  const q = (filterableFields?.q as string | undefined)?.trim()
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

    console.log("[SKU Search] Variant SKU matches:", variants.length)

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

    // Also search products by title/handle so we merge both result sets
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

    const titleProductIds = [
      ...titleProducts.map((p: any) => p.id),
      ...handleProducts.map((p: any) => p.id),
    ]

    const allIds = [...new Set([...skuProductIds, ...titleProductIds])]

    console.log(
      "[SKU Search] Found products — SKU:", skuProductIds.length,
      "Title:", titleProducts.length,
      "Handle:", handleProducts.length,
      "Total unique:", allIds.length
    )

    if (allIds.length > 0) {
      // Replace q with id filter on filterableFields (already validated)
      filterableFields.id = allIds
      delete filterableFields.q
      console.log("[SKU Search] Replaced q with", allIds.length, "product IDs")
    }
  } catch (err: any) {
    console.warn("[SKU Search] Middleware error:", err.message)
  }

  next()
}
