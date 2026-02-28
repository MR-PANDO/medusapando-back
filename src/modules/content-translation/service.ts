import { MedusaService } from "@medusajs/framework/utils"
import { ContentTranslation } from "./models/content-translation"

class ContentTranslationModuleService extends MedusaService({
  ContentTranslation,
}) {
  constructor(container: Record<string, any>, ...rest: any[]) {
    super(container, ...rest)

    const internalService = container["contentTranslationService"]
    const baseRepo = (this as any).baseRepository_

    if (!internalService) {
      console.error("[ContentTranslation Module] contentTranslationService not found in container.")
      return
    }

    const serialize = async (data: any) => baseRepo.serialize(data)

    ;(this as any).listContentTranslations = async (
      filters: any = {},
      config: any = {}
    ) => {
      const results = await internalService.list(filters, config)
      return await serialize(results)
    }

    ;(this as any).listAndCountContentTranslations = async (
      filters: any = {},
      config: any = {}
    ) => {
      const [results, count] = await internalService.listAndCount(filters, config)
      return [await serialize(results), count]
    }

    ;(this as any).retrieveContentTranslation = async (
      id: string,
      config: any = {}
    ) => {
      const result = await internalService.retrieve(id, config)
      return await serialize(result)
    }

    ;(this as any).createContentTranslations = async (data: any) => {
      const result = await internalService.create(data)
      return await serialize(result)
    }

    ;(this as any).updateContentTranslations = async (data: any) => {
      const result = await internalService.update(data)
      return await serialize(result)
    }

    ;(this as any).deleteContentTranslations = async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids]
      await internalService.delete(idArray)
    }
  }

  /**
   * Upsert a translation for a given entity + locale.
   * Creates if not found, updates if exists.
   */
  async upsertTranslation(
    entity_type: string,
    entity_id: string,
    locale: string,
    data: { title?: string | null; description?: string | null }
  ): Promise<Record<string, any>> {
    const existing = await (this as any).listContentTranslations(
      { entity_type, entity_id, locale },
      { take: 1 }
    )

    if (existing && existing.length > 0) {
      const record = existing[0]
      const updated = await (this as any).updateContentTranslations({
        id: record.id,
        ...data,
      })
      return updated
    }

    const created = await (this as any).createContentTranslations({
      entity_type,
      entity_id,
      locale,
      ...data,
    })
    return created
  }
}

export default ContentTranslationModuleService
