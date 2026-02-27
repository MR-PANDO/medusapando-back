import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEO_MODULE } from "../../../modules/seo"
import SeoModuleService from "../../../modules/seo/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const resource_type = req.query.resource_type as string | undefined

  const filters: Record<string, any> = {}
  if (resource_type) {
    filters.resource_type = resource_type
  }

  const [records, count] = await seoService.listAndCountSeoMetadatas(filters, {
    skip: offset,
    take: limit,
  })

  res.json({
    seo_metadata: records,
    count,
    limit,
    offset,
  })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const result = await seoService.upsertSeoMetadata(req.body)

  res.status(201).json({ seo_metadata: result })
}
