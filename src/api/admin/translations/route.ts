import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IEventBusService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { PostAdminCreateTranslationType } from "./validators"
import { CONTENT_TRANSLATION_MODULE } from "../../../modules/content-translation"
import ContentTranslationModuleService from "../../../modules/content-translation/service"

// POST /admin/translations - Create or upsert a translation
export const POST = async (
  req: MedusaRequest<PostAdminCreateTranslationType>,
  res: MedusaResponse
) => {
  const service: ContentTranslationModuleService = req.scope.resolve(
    CONTENT_TRANSLATION_MODULE
  )

  const { entity_type, entity_id, locale, title, description } =
    req.validatedBody

  const translation = await service.upsertTranslation(
    entity_type,
    entity_id,
    locale,
    { title, description }
  )

  // Emit event for subscriber (cache revalidation)
  try {
    const eventBus: IEventBusService = req.scope.resolve(Modules.EVENT_BUS)
    await eventBus.emit({
      name: "content-translation.updated",
      data: { entity_type, entity_id },
    })
  } catch (e) {
    // Non-critical — translation was saved successfully
  }

  res.status(201).json({ translation })
}
