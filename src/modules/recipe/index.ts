import { Module } from "@medusajs/framework/utils"
import RecipeModuleService from "./service"

// Change this to just "recipe" if you want cleaner naming
export const RECIPE_MODULE = "recipe"  

export default Module(RECIPE_MODULE, {
  service: RecipeModuleService,
})