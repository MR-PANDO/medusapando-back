import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COLOMBIA_GEO_MODULE } from "../../../../modules/colombia-geo"
import ColombiaGeoModuleService from "../../../../modules/colombia-geo/service"

// GET /store/colombia-geo/departamentos - Get all departamentos
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const colombiaGeoService = req.scope.resolve<ColombiaGeoModuleService>(COLOMBIA_GEO_MODULE)

    const departamentos = await colombiaGeoService.listDepartamentosOrdered()

    res.json({
      departamentos,
      count: departamentos.length,
    })
  } catch (error) {
    console.error("Error fetching departamentos:", error)
    res.status(500).json({
      departamentos: [],
      count: 0,
      error: "Failed to fetch departamentos"
    })
  }
}
