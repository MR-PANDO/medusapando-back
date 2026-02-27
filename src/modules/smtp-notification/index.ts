import { Module } from "@medusajs/framework/utils"
import SmtpNotificationService from "./service"

export const SMTP_NOTIFICATION_MODULE = "notification-smtp"

export default Module(SMTP_NOTIFICATION_MODULE, {
  service: SmtpNotificationService,
})
