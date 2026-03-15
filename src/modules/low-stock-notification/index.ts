import { Module } from "@medusajs/framework/utils"
import LowStockNotificationService from "./service"

export const LOW_STOCK_MODULE = "lowStockNotification"

export default Module(LOW_STOCK_MODULE, {
  service: LowStockNotificationService,
})
