import { MedusaContainer } from "@medusajs/framework/types"
import { runNubexSync } from "../utils/nubex-sync"

export default async function nubexSyncJob(container: MedusaContainer) {
  // Skip if not configured
  if (!process.env.NUBEX_DB_HOST) {
    return
  }

  try {
    await runNubexSync(container, "scheduled")
  } catch (error) {
    console.error("[NubexSync Job] Failed:", error)
  }
}

export const config = {
  name: "nubex-erp-sync",
  // Default: every 15 minutes
  schedule: process.env.NUBEX_SYNC_CRON || "*/15 * * * *",
}
