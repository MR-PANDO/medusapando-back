import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * Middleware that adds `id ASC` as a secondary sort to product listings.
 * This ensures deterministic pagination — without it, products with the same
 * primary sort value (e.g., same created_at) can appear on multiple pages.
 */
export async function stableSortMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const queryConfig = (req as any).queryConfig
  const listConfig = (req as any).listConfig

  // Add id as tiebreaker to remoteQueryConfig.pagination.order
  if (queryConfig?.pagination) {
    if (!queryConfig.pagination.order) {
      queryConfig.pagination.order = { id: "ASC" }
    } else if (!queryConfig.pagination.order.id) {
      queryConfig.pagination.order.id = "ASC"
    }
    // Debug header so we can verify the middleware ran
    res.setHeader("X-Stable-Sort", JSON.stringify(queryConfig.pagination.order))
  }

  // Add id as tiebreaker to listConfig.order
  if (listConfig) {
    if (!listConfig.order) {
      listConfig.order = { id: "ASC" }
    } else if (!listConfig.order.id) {
      listConfig.order.id = "ASC"
    }
  }

  next()
}
