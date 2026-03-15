import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { NUBEX_MODULE } from "../modules/nubex"
import type NubexModuleService from "../modules/nubex/service"
import { LOW_STOCK_MODULE } from "../modules/low-stock-notification"
import type LowStockNotificationService from "../modules/low-stock-notification/service"
import { EMAIL_AUDIT_MODULE } from "../modules/email-audit"
import type EmailAuditModuleService from "../modules/email-audit/service"
import { sendLowStockNotification } from "../utils/nubex-low-stock-email"

/**
 * Low-stock notification job — runs every hour, checks if current Bogota time
 * matches the configured morning/afternoon times, then sends email for
 * published products below the threshold.
 */
export default async function nubexLowStockNotificationJob(
  container: MedusaContainer
) {
  if (!process.env.NUBEX_DB_HOST) return

  const lowStockService = container.resolve(LOW_STOCK_MODULE) as LowStockNotificationService

  try {
    const settings = await lowStockService.getSettings()
    if (!settings?.enabled || !settings.notification_email || !settings.threshold) {
      return
    }

    // Check if current Bogota time matches either notification hour
    const now = new Date()
    const bogotaTime = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Bogota" })
    )
    const currentHour = bogotaTime.getHours().toString().padStart(2, "0")
    const morningHour = (settings.morning_time || "08:00").split(":")[0]
    const afternoonHour = (settings.afternoon_time || "14:00").split(":")[0]

    if (currentHour !== morningHour && currentHour !== afternoonHour) {
      return
    }

    console.log(
      `[LowStock] Running at ${currentHour}:00 Bogota (schedule: ${settings.morning_time}, ${settings.afternoon_time})`
    )

    const nubexService = container.resolve(NUBEX_MODULE) as NubexModuleService
    const query = container.resolve(ContainerRegistrationKeys.QUERY) as any

    const erpProducts = await nubexService.queryErpProducts()
    const erpMap = new Map<string, (typeof erpProducts)[0]>()
    for (const p of erpProducts) {
      if (p.sku) erpMap.set(p.sku, p)
    }

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "title", "product.id", "product.title", "product.status"],
    })

    const lowStockItems: Array<{
      sku: string
      product_title: string
      variant_title: string
      quantity: number
      threshold: number
    }> = []

    for (const variant of variants) {
      if (!variant.sku) continue
      if (variant.product?.status !== "published") continue
      const erpProduct = erpMap.get(variant.sku)
      if (!erpProduct) continue
      const qty = Math.max(0, Math.floor(erpProduct.cantidad))
      if (qty < settings.threshold) {
        lowStockItems.push({
          sku: variant.sku,
          product_title: variant.product?.title ?? "",
          variant_title: variant.title ?? "",
          quantity: qty,
          threshold: settings.threshold,
        })
      }
    }

    if (lowStockItems.length === 0) {
      console.log("[LowStock] No published products below threshold")
      return
    }

    console.log(`[LowStock] ${lowStockItems.length} items below threshold. Sending...`)

    let auditService: EmailAuditModuleService | undefined
    try {
      auditService = container.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
    } catch {}

    await sendLowStockNotification({
      to: settings.notification_email,
      items: lowStockItems,
      threshold: settings.threshold,
      auditService,
    })

    console.log("[LowStock] Notification sent")
  } catch (err: any) {
    console.error("[LowStock] Job error:", err.message)
  }
}

export const config = {
  name: "nubex-low-stock-notification",
  schedule: "0 * * * *",
}
