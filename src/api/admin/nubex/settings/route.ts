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

  // Validate comma-separated emails
  const emailStr = notification_email ? String(notification_email).trim() : ""
  if (low_stock_enabled && !emailStr) {
    res.status(400).json({ error: "Se requiere al menos un email para activar las notificaciones" })
    return
  }

  if (emailStr) {
    const emails = emailStr.split(",").map((e: string) => e.trim()).filter(Boolean)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalid = emails.filter((e: string) => !emailRegex.test(e))
    if (invalid.length > 0) {
      res.status(400).json({ error: `Email(s) invalido(s): ${invalid.join(", ")}` })
      return
    }
  }

  await nubexService.upsertNubexSettings({
    low_stock_threshold: Math.floor(low_stock_threshold),
    notification_email: emailStr || null,
    low_stock_enabled: !!low_stock_enabled,
  })

  res.json({ success: true })
}
