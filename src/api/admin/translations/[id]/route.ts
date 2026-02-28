import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CONTENT_TRANSLATION_MODULE } from "../../../../modules/content-translation"
import ContentTranslationModuleService from "../../../../modules/content-translation/service"

// DELETE /admin/translations/:id - Delete a specific translation
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: ContentTranslationModuleService = req.scope.resolve(
    CONTENT_TRANSLATION_MODULE
  )
  const { id } = req.params

  await (service as any).deleteContentTranslations(id)

  res.status(200).json({
    id,
    object: "content_translation",
    deleted: true,
  })
}
