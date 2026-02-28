import { Module } from "@medusajs/framework/utils"
import ContentTranslationModuleService from "./service"

export const CONTENT_TRANSLATION_MODULE = "contentTranslation"

export default Module(CONTENT_TRANSLATION_MODULE, {
  service: ContentTranslationModuleService,
})
