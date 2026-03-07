import { model } from "@medusajs/framework/utils"

export const SmtpSettings = model.define("smtp_settings", {
  id: model.id().primaryKey(),
  host: model.text(),
  port: model.number().default(465),
  secure: model.boolean().default(true),
  user: model.text(),
  pass: model.text(),
  from: model.text(),
})
