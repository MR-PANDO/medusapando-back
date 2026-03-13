import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { runNubexSync } from "../../../../utils/nubex-sync"

/**
 * POST /admin/nubex/sync — Trigger a manual sync
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!process.env.NUBEX_DB_HOST || !process.env.NUBEX_DB_USER || !process.env.NUBEX_DB_PASSWORD) {
    res.status(400).json({
      error: "Nubex ERP no esta configurado. Se requieren NUBEX_DB_HOST, NUBEX_DB_USER y NUBEX_DB_PASSWORD.",
    })
    return
  }

  try {
    const result = await runNubexSync(req.scope, "manual")
    res.json({ success: true, result })
  } catch (error: any) {
    // 409 if sync is already running (concurrency lock)
    const status = error.message?.includes("en curso") ? 409 : 500
    res.status(status).json({
      error: error.message || "Error al sincronizar con Nubex",
    })
  }
}
