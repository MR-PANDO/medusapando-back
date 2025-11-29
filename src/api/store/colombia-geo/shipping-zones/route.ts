import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COLOMBIA_GEO_MODULE } from "../../../../modules/colombia-geo"
import ColombiaGeoModuleService from "../../../../modules/colombia-geo/service"

// GET /store/colombia-geo/shipping-zones - Get all active shipping zones
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const colombiaGeoService = req.scope.resolve<ColombiaGeoModuleService>(COLOMBIA_GEO_MODULE)

    const shippingZones = await colombiaGeoService.listActiveShippingZones()

    res.json({
      shipping_zones: shippingZones,
      count: shippingZones.length,
    })
  } catch (error) {
    console.error("Error fetching shipping zones:", error)
    res.status(500).json({
      shipping_zones: [],
      count: 0,
      error: "Failed to fetch shipping zones"
    })
  }
}
