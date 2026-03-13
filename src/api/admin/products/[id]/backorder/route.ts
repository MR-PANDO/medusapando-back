import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/**
 * POST /admin/products/:id/backorder
 * Toggles allow_backorder on ALL variants of a product.
 *
 * Body: { allow_backorder: boolean }
 * Response: { updated: number }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id
  const { allow_backorder } = req.body as { allow_backorder: boolean }

  if (typeof allow_backorder !== "boolean") {
    res.status(400).json({ error: "allow_backorder (boolean) is required" })
    return
  }

  const productService = req.scope.resolve(Modules.PRODUCT) as any

  // Get all variants for this product
  const [variants] = await productService.listAndCountProductVariants(
    { product_id: productId },
    { select: ["id"] }
  )

  if (variants.length === 0) {
    res.json({ updated: 0 })
    return
  }

  // Update all variants
  let updated = 0
  for (const variant of variants) {
    await productService.updateProductVariants(variant.id, {
      allow_backorder,
    })
    updated++
  }

  res.json({ updated })
}
