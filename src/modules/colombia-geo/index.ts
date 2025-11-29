import { Module } from "@medusajs/framework/utils"
import ColombiaGeoModuleService from "./service"

export const COLOMBIA_GEO_MODULE = "colombiaGeoModuleService"

export default Module(COLOMBIA_GEO_MODULE, {
  service: ColombiaGeoModuleService,
})
