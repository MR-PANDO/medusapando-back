import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COLOMBIA_GEO_MODULE } from "../../../../../modules/colombia-geo"
import ColombiaGeoModuleService from "../../../../../modules/colombia-geo/service"

type Params = {
  municipioCode: string
}

// GET /store/colombia-geo/shipping-zone/:municipioCode - Get shipping zone for a municipio
export const GET = async (req: MedusaRequest<Params>, res: MedusaResponse) => {
  try {
    const { municipioCode } = req.params
    const colombiaGeoService = req.scope.resolve<ColombiaGeoModuleService>(COLOMBIA_GEO_MODULE)

    const shippingZone = await colombiaGeoService.getShippingZoneForMunicipio(municipioCode)

    if (!shippingZone) {
      return res.status(404).json({
        shipping_zone: null,
        error: "Shipping zone not found for this municipio"
      })
    }

    res.json({
      shipping_zone: shippingZone,
      municipio_code: municipioCode,
    })
  } catch (error) {
    console.error("Error fetching shipping zone:", error)
    res.status(500).json({
      shipping_zone: null,
      error: "Failed to fetch shipping zone"
    })
  }
}
