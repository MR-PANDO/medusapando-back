import { Module } from "@medusajs/framework/utils"
import EmailAuditModuleService from "./service"

export const EMAIL_AUDIT_MODULE = "emailAudit"

export default Module(EMAIL_AUDIT_MODULE, {
  service: EmailAuditModuleService,
})
