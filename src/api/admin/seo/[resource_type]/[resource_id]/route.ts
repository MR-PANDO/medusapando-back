import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEO_MODULE } from "../../../../../modules/seo"
import SeoModuleService from "../../../../../modules/seo/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const { resource_type, resource_id } = req.params

  const [record] = await seoService.listSeoMetadatas(
    {
      resource_type,
      resource_id,
    },
    { take: 1 }
  )

  if (!record) {
    return res.status(404).json({ message: "SEO metadata not found" })
  }

  res.json({ seo_metadata: record })
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const { resource_type, resource_id } = req.params

  const result = await seoService.upsertSeoMetadata({
    resource_type,
    resource_id,
    ...req.body,
  })

  res.json({ seo_metadata: result })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const { resource_type, resource_id } = req.params

  const [record] = await seoService.listSeoMetadatas(
    {
      resource_type,
      resource_id,
    },
    { take: 1 }
  )

  if (!record) {
    return res.status(404).json({ message: "SEO metadata not found" })
  }

  await seoService.deleteSeoMetadatas(record.id)

  res.status(200).json({ id: record.id, deleted: true })
}
