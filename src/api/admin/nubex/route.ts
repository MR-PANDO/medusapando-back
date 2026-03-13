import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NUBEX_MODULE } from "../../../modules/nubex"
import type NubexModuleService from "../../../modules/nubex/service"

/**
 * GET /admin/nubex — Sync status and recent logs
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const nubexService = req.scope.resolve(NUBEX_MODULE) as NubexModuleService

  const limit = Number(req.query.limit) || 10
  const logs = await nubexService.getRecentSyncs(limit)

  const configured = !!process.env.NUBEX_DB_HOST

  res.json({
    configured,
    logs,
  })
}
