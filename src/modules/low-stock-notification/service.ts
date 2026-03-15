import { MedusaService } from "@medusajs/framework/utils"
import { LowStockSettings } from "./models/low-stock-settings"

class LowStockNotificationService extends MedusaService({
  LowStockSettings,
}) {
  async getSettings(): Promise<{
    threshold: number
    notification_email: string | null
    enabled: boolean
    morning_time: string
    afternoon_time: string
  } | null> {
    const [records] = await this.listAndCountLowStockSettings(
      {},
      { take: 1, order: { created_at: "DESC" } }
    )
    if (records.length === 0) return null
    const r = records[0] as any
    return {
      threshold: r.threshold,
      notification_email: r.notification_email ?? null,
      enabled: r.enabled,
      morning_time: r.morning_time ?? "08:00",
      afternoon_time: r.afternoon_time ?? "14:00",
    }
  }

  async upsertSettings(data: {
    threshold: number
    notification_email: string | null
    enabled: boolean
    morning_time: string
    afternoon_time: string
  }) {
    const [existing] = await this.listAndCountLowStockSettings({}, { take: 1 })
    if (existing.length > 0) {
      return this.updateLowStockSettings({
        id: (existing[0] as any).id,
        ...data,
      })
    }
    return this.createLowStockSettings(data)
  }
}

export default LowStockNotificationService
