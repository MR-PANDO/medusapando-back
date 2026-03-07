import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WOMPI_MODULE } from "../../../../modules/wompi"
import type WompiModuleService from "../../../../modules/wompi/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wompiService = req.scope.resolve<WompiModuleService>(WOMPI_MODULE)
  const settings = await wompiService.getSettings()
  res.json({ settings })
}
