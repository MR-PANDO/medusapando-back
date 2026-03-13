import { model } from "@medusajs/framework/utils"
import { NubexSyncLog } from "./nubex-sync-log"

export const NubexSyncDetail = model.define("nubex_sync_detail", {
  id: model.id().primaryKey(),
  sync_log: model.belongsTo(() => NubexSyncLog, { mappedBy: "details" }),
  product_id: model.text(),
  product_title: model.text().default(""),
  variant_id: model.text(),
  variant_title: model.text().default(""),
  sku: model.text(),
  price_changed: model.boolean().default(false),
  old_price: model.float().nullable(),
  new_price: model.float().nullable(),
  qty_changed: model.boolean().default(false),
  old_qty: model.number().nullable(),
  new_qty: model.number().nullable(),
  status_changed: model.boolean().default(false),
  old_status: model.text().nullable(),
  new_status: model.text().nullable(),
})
