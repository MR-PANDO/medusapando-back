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
