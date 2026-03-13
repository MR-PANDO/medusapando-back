import { model } from "@medusajs/framework/utils"
import { NubexSyncDetail } from "./nubex-sync-detail"

export const NubexSyncLog = model.define("nubex_sync_log", {
  id: model.id().primaryKey(),
  status: model.enum(["running", "completed", "failed"]),
  trigger: model.enum(["scheduled", "manual"]).default("scheduled"),
  total_erp_products: model.number().default(0),
  matched_skus: model.number().default(0),
  prices_updated: model.number().default(0),
  inventory_updated: model.number().default(0),
  inventory_created: model.number().default(0),
  products_published: model.number().default(0),
  products_unpublished: model.number().default(0),
  errors: model.number().default(0),
  error_details: model.text().nullable(),
  duration_ms: model.number().default(0),
  started_at: model.dateTime(),
  finished_at: model.dateTime().nullable(),
  details: model.hasMany(() => NubexSyncDetail, { mappedBy: "sync_log" }),
})
