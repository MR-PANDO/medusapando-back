import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NUBEX_MODULE } from "../../../../modules/nubex"
import type NubexModuleService from "../../../../modules/nubex/service"

/**
 * GET /admin/nubex/settings — Get low-stock notification settings
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const nubexService = req.scope.resolve(NUBEX_MODULE) as NubexModuleService
  const settings = await nubexService.getNubexSettings()
  res.json({ settings })
}

/**
 * POST /admin/nubex/settings — Update low-stock notification settings
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const nubexService = req.scope.resolve(NUBEX_MODULE) as NubexModuleService
  const { low_stock_threshold, notification_email, low_stock_enabled } =
    req.body as any

  if (low_stock_threshold == null || typeof low_stock_threshold !== "number" || low_stock_threshold < 0) {
    res.status(400).json({ error: "low_stock_threshold debe ser un numero >= 0" })
    return
  }

  if (low_stock_enabled && !notification_email) {
    res.status(400).json({ error: "Se requiere un email para activar las notificaciones" })
    return
  }

  await nubexService.upsertNubexSettings({
    low_stock_threshold: Math.floor(low_stock_threshold),
    notification_email: notification_email || null,
    low_stock_enabled: !!low_stock_enabled,
  })

  res.json({ success: true })
}
