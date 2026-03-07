import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WOMPI_MODULE } from "../../../../modules/wompi"
import type WompiModuleService from "../../../../modules/wompi/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wompiService = req.scope.resolve<WompiModuleService>(WOMPI_MODULE)
  const { id } = req.params

  try {
    const payment = await wompiService.retrieveWompiPayment(id)
    res.json({ wompi_payment: payment })
  } catch {
    res.status(404).json({ error: "Payment record not found" })
  }
}
