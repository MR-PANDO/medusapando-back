import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEO_MODULE } from "../../../../../modules/seo"
import SeoModuleService from "../../../../../modules/seo/service"

const VALID_RESOURCE_TYPES = ["product", "category", "page"]

/** Fields that are internal-only and should not be exposed to the storefront. */
const INTERNAL_FIELDS = ["sxo_cwv_notes"]

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

  // Strip internal-only fields before returning to the storefront
  const sanitized = { ...record }
  for (const field of INTERNAL_FIELDS) {
    delete sanitized[field]
  }

  res.json({ seo_metadata: sanitized })
}
