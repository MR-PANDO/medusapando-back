import { Module } from "@medusajs/framework/utils"
import RecipeModuleService from "./service"

export const RECIPE_MODULE = "recipeModuleService"

export default Module(RECIPE_MODULE, {
  service: RecipeModuleService,
})
