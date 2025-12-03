import { Module } from "@medusajs/framework/utils"
import NutritionModuleService from "./service"

export const NUTRITION_MODULE = "nutrition"

export default Module(NUTRITION_MODULE, {
  service: NutritionModuleService,
})
