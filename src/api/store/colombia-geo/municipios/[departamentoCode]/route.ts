import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { COLOMBIA_GEO_MODULE } from "../../../../../modules/colombia-geo"
import ColombiaGeoModuleService from "../../../../../modules/colombia-geo/service"

type Params = {
  departamentoCode: string
}

// GET /store/colombia-geo/municipios/:departamentoCode - Get municipios by departamento
export const GET = async (req: MedusaRequest<Params>, res: MedusaResponse) => {
  try {
    const { departamentoCode } = req.params
    const colombiaGeoService = req.scope.resolve<ColombiaGeoModuleService>(COLOMBIA_GEO_MODULE)

    const municipios = await colombiaGeoService.listMunicipiosByDepartamento(departamentoCode)

    res.json({
      municipios,
      count: municipios.length,
      departamento_code: departamentoCode,
    })
  } catch (error) {
    console.error("Error fetching municipios:", error)
    res.status(500).json({
      municipios: [],
      count: 0,
      error: "Failed to fetch municipios"
    })
  }
}
