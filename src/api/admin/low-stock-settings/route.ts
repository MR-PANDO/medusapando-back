import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOW_STOCK_MODULE } from "../../../modules/low-stock-notification"
import type LowStockNotificationService from "../../../modules/low-stock-notification/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(LOW_STOCK_MODULE) as LowStockNotificationService
  const settings = await service.getSettings()
  res.json({ settings })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(LOW_STOCK_MODULE) as LowStockNotificationService
  const { threshold, notification_email, enabled, morning_time, afternoon_time } =
    req.body as any

  if (threshold == null || typeof threshold !== "number" || threshold < 0) {
    res.status(400).json({ error: "threshold debe ser un numero >= 0" })
    return
  }

  const emailStr = notification_email ? String(notification_email).trim() : ""
  if (enabled && !emailStr) {
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

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  const mTime = morning_time || "08:00"
  const aTime = afternoon_time || "14:00"

  if (!timeRegex.test(mTime)) {
    res.status(400).json({ error: "Formato de hora manana invalido (HH:MM)" })
    return
  }
  if (!timeRegex.test(aTime)) {
    res.status(400).json({ error: "Formato de hora tarde invalido (HH:MM)" })
    return
  }

  await service.upsertSettings({
    threshold: Math.floor(threshold),
    notification_email: emailStr || null,
    enabled: !!enabled,
    morning_time: mTime,
    afternoon_time: aTime,
  })

  res.json({ success: true })
}
