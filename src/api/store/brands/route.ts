import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

// GET /store/brands - List all brands (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const limit = req.query.limit ? parseInt(req.query.limit as string) : 100
  const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

  const [brands, count] = await brandModuleService.listAndCountBrands(
    {},
    {
      skip: offset,
      take: limit,
    }
  )

  res.json({
    brands,
    count,
    limit,
    offset,
  })
}
