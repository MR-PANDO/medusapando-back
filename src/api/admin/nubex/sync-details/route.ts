import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NUBEX_MODULE } from "../../../../modules/nubex"
import type NubexModuleService from "../../../../modules/nubex/service"

/**
 * GET /admin/nubex/sync-details?sync_log_id=xxx
 * Returns per-variant change details for a specific sync log.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const syncLogId = req.query.sync_log_id as string

  if (!syncLogId) {
    res.status(400).json({ error: "sync_log_id is required" })
    return
  }

  const nubexService = req.scope.resolve(NUBEX_MODULE) as NubexModuleService

  const [details] = await nubexService.listAndCountNubexSyncDetails(
    { sync_log_id: syncLogId },
    { take: 500, order: { product_title: "ASC", sku: "ASC" } }
  )

  res.json({ details })
}
