import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"

// GET /store/products/:id/brand - Get product's brand (public)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  try {
    // Query the link between product and brand
    const { data } = await query.graph({
      entity: "product_product_brandmodule_brand",
      fields: ["brand_id", "product_id"],
      filters: {
        product_id: id,
      },
    })

    if (!data || data.length === 0) {
      return res.json({ brand: null })
    }

    // Get the brand details
    const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)
    const brand = await brandModuleService.retrieveBrand(data[0].brand_id)

    res.json({
      brand: {
        id: brand.id,
        name: brand.name,
        handle: brand.handle,
      }
    })
  } catch (error) {
    // If no link found, return null
    res.json({ brand: null })
  }
}
