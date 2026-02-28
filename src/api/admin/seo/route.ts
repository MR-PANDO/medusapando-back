import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEO_MODULE } from "../../../modules/seo"
import SeoModuleService from "../../../modules/seo/service"

const VALID_RESOURCE_TYPES = ["product", "category", "page"]
const MAX_LIMIT = 200

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const rawLimit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 100 : rawLimit), MAX_LIMIT)
  const rawOffset = req.query.offset ? parseInt(req.query.offset as string) : 0
  const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)
  const resource_type = req.query.resource_type as string | undefined

  const filters: Record<string, any> = {}
  if (resource_type) {
    if (!VALID_RESOURCE_TYPES.includes(resource_type)) {
      return res.status(400).json({
        message: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(", ")}`,
      })
    }
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

  // Body is already validated by Zod middleware (PostAdminCreateSeo).
  // Strip auto-calculated fields that must not come from the client.
  const { id, seo_score, aeo_score, geo_score, sxo_score, created_at, updated_at, deleted_at, ...safeBody } =
    req.body as Record<string, any>

  const result = await seoService.upsertSeoMetadata(safeBody)

  res.status(201).json({ seo_metadata: result })
}
