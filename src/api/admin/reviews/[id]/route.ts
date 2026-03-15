import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateReviewStatusWorkflow } from "../../../../workflows/product-review/update-review-status"

type UpdateReviewStatusBody = {
  status: "approved" | "rejected"
}

export const POST = async (
  req: MedusaRequest<UpdateReviewStatusBody>,
  res: MedusaResponse
) => {
  const { id } = req.params
  const { status } = req.body

  if (!status || !["approved", "rejected"].includes(status)) {
    res.status(400).json({
      message: "Invalid status. Must be 'approved' or 'rejected'.",
    })
    return
  }

  const { result: review } = await updateReviewStatusWorkflow(
    req.scope
  ).run({
    input: { id, status },
  })

  res.json({ review })
}
