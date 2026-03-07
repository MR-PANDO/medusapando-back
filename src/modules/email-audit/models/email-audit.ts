import { model } from "@medusajs/framework/utils"

export const EmailAudit = model.define("email_audit", {
  id: model.id().primaryKey(),
  to: model.text(),
  from: model.text(),
  subject: model.text(),
  email_type: model.text(),
  status: model.text().default("queued"),
  error: model.text().nullable(),
  metadata: model.json().nullable(),
  sent_at: model.dateTime().nullable(),
})
