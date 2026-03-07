import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { WOMPI_MODULE } from "../../../modules/wompi"
import type WompiModuleService from "../../../modules/wompi/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const wompiService = req.scope.resolve<WompiModuleService>(WOMPI_MODULE)

  const { status, pending_only } = req.query as Record<string, string>

  let payments
  if (pending_only === "true") {
    payments = await wompiService.getPendingPayments()
  } else {
    payments = await wompiService.getAllPayments({
      status: status ? [status] : undefined,
    })
  }

  res.json({ wompi_payments: payments, count: payments.length })
}
