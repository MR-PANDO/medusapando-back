import { Module } from "@medusajs/framework/utils"
import WompiModuleService from "./service"

export const WOMPI_MODULE = "wompi"

export default Module(WOMPI_MODULE, {
  service: WompiModuleService,
})
