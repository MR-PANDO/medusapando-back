import { Module } from "@medusajs/framework/utils"
import NubexModuleService from "./service"

export const NUBEX_MODULE = "nubexModuleService"

export default Module(NUBEX_MODULE, {
  service: NubexModuleService,
})
