import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_TRANSLATION_MODULE } from "../../../../../modules/content-translation"
import ContentTranslationModuleService from "../../../../../modules/content-translation/service"

// GET /admin/translations/:entity_type/:entity_id - Get all locale translations for an entity
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentTranslationModuleService = req.scope.resolve(
    CONTENT_TRANSLATION_MODULE
  )
  const { entity_type, entity_id } = req.params

  const translations = await (service as any).listContentTranslations(
    { entity_type, entity_id },
    { take: 50 }
  )

  res.json({ translations })
}
