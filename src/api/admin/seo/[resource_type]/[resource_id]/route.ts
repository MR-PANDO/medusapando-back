import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEO_MODULE } from "../../../../../modules/seo"
import SeoModuleService from "../../../../../modules/seo/service"

const VALID_RESOURCE_TYPES = ["product", "category", "page"]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const { resource_type, resource_id } = req.params

  if (!VALID_RESOURCE_TYPES.includes(resource_type)) {
    return res.status(400).json({
      message: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(", ")}`,
    })
  }

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

  if (!VALID_RESOURCE_TYPES.includes(resource_type)) {
    return res.status(400).json({
      message: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(", ")}`,
    })
  }

  // Body is already validated by Zod middleware (PostAdminUpdateSeo).
  // Strip fields that must not be overridden via body.
  const { id, resource_type: _rt, resource_id: _ri, seo_score, aeo_score, geo_score, sxo_score, created_at, updated_at, deleted_at, ...safeFields } =
    req.body as Record<string, any>

  const result = await seoService.upsertSeoMetadata({
    resource_type,
    resource_id,
    ...safeFields,
  })

  res.json({ seo_metadata: result })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const seoService: SeoModuleService = req.scope.resolve(SEO_MODULE)

  const { resource_type, resource_id } = req.params

  if (!VALID_RESOURCE_TYPES.includes(resource_type)) {
    return res.status(400).json({
      message: `Invalid resource_type. Must be one of: ${VALID_RESOURCE_TYPES.join(", ")}`,
    })
  }

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
