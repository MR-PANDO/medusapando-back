import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PostAdminUpdateBrandType } from "../validators"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

// GET /admin/brands/:id - Get a single brand
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { id } = req.params

  const brand = await brandModuleService.retrieveBrand(id)

  res.json({ brand })
}

// POST /admin/brands/:id - Update a brand
export const POST = async (
  req: MedusaRequest<PostAdminUpdateBrandType>,
  res: MedusaResponse
) => {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { id } = req.params

  const brand = await brandModuleService.updateBrands({
    id,
    ...req.validatedBody,
  })

  res.json({ brand })
}

// DELETE /admin/brands/:id - Delete a brand
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { id } = req.params

  await brandModuleService.deleteBrands(id)

  res.status(200).json({
    id,
    object: "brand",
    deleted: true,
  })
}
