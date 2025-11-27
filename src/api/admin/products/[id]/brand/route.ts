import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"

// GET /admin/products/:id/brand - Get product's brand
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

    res.json({ brand })
  } catch (error) {
    // If no link found, return null
    res.json({ brand: null })
  }
}

// POST /admin/products/:id/brand - Set product's brand
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { brand_id } = req.body as { brand_id: string | null }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const brandModuleService: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  try {
    // First, remove any existing brand link for this product
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data: existingLinks } = await query.graph({
      entity: "product_product_brandmodule_brand",
      fields: ["brand_id", "product_id"],
      filters: {
        product_id: id,
      },
    })

    // Dismiss existing links
    if (existingLinks && existingLinks.length > 0) {
      await remoteLink.dismiss({
        "product.product": { product_id: id },
        "brandModuleService.brand": { brand_id: existingLinks[0].brand_id },
      })
    }

    // If brand_id is provided, create new link
    if (brand_id) {
      await remoteLink.create({
        "product.product": { product_id: id },
        "brandModuleService.brand": { brand_id: brand_id },
      })

      const brand = await brandModuleService.retrieveBrand(brand_id)
      return res.json({ brand })
    }

    res.json({ brand: null })
  } catch (error) {
    console.error("Error updating product brand:", error)
    res.status(500).json({ error: "Failed to update brand" })
  }
}
