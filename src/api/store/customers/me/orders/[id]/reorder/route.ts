import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { reorderWorkflow } from "../../../../../../../workflows/reorder"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const orderId = req.params.id
  const customerId = req.auth_context.actor_id

  try {
    const { result: cart } = await reorderWorkflow(req.scope).run({
      input: {
        order_id: orderId,
        customer_id: customerId,
      },
    })

    res.status(201).json({ cart })
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Failed to create reorder cart",
    })
  }
}
