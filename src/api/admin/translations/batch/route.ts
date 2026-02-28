import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PostAdminBatchTranslationsType } from "../validators"
import { CONTENT_TRANSLATION_MODULE } from "../../../../modules/content-translation"
import ContentTranslationModuleService from "../../../../modules/content-translation/service"

// POST /admin/translations/batch - Bulk create/upsert translations
export const POST = async (
  req: MedusaRequest<PostAdminBatchTranslationsType>,
  res: MedusaResponse
) => {
  const service: ContentTranslationModuleService = req.scope.resolve(
    CONTENT_TRANSLATION_MODULE
  )

  const { translations } = req.validatedBody

  let created = 0
  let updated = 0

  for (const item of translations) {
    const existing = await (service as any).listContentTranslations(
      {
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        locale: item.locale,
      },
      { take: 1 }
    )

    if (existing && existing.length > 0) {
      await (service as any).updateContentTranslations({
        id: existing[0].id,
        title: item.title,
        description: item.description,
      })
      updated++
    } else {
      await (service as any).createContentTranslations({
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        locale: item.locale,
        title: item.title,
        description: item.description,
      })
      created++
    }
  }

  res.status(200).json({ created, updated })
}
