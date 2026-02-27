import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { reorderWorkflow } from "../../../../../../../workflows/reorder"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const orderId = req.params.id

  // Ensure the customer is authenticated
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    res.status(401).json({ message: "Authentication required" })
    return
  }

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
