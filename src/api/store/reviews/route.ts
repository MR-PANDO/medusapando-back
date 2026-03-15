import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review"
import ProductReviewModuleService from "../../../modules/product-review/service"
import { createReviewWorkflow } from "../../../workflows/product-review/create-review"

type CreateReviewBody = {
  product_id: string
  rating: number
  content: string
  title?: string
}

export const POST = async (
  req: AuthenticatedMedusaRequest<CreateReviewBody>,
  res: MedusaResponse
) => {
  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.ip ||
    "unknown"
  const userAgent = (req.headers["user-agent"] as string) || null

  const reviewService =
    req.scope.resolve<ProductReviewModuleService>(PRODUCT_REVIEW_MODULE)

  // Check antispam
  const spamCheck = await reviewService.checkSpam(ip, req.body.product_id)
  if (spamCheck.isSpam) {
    res.status(429).json({
      message: spamCheck.reason || "Too many reviews submitted",
    })
    return
  }

  // Get customer info for name defaults
  const customerId = req.auth_context?.actor_id || null
  let firstName = "Anonymous"
  let lastName = ""

  if (customerId) {
    try {
      const customerService = req.scope.resolve("customer") as any
      const customer = await customerService.retrieveCustomer(customerId)
      firstName = customer.first_name || "Anonymous"
      lastName = customer.last_name || ""
    } catch {
      // Customer not found, use defaults
    }
  }

  const { result: review } = await createReviewWorkflow(req.scope).run({
    input: {
      product_id: req.body.product_id,
      rating: req.body.rating,
      content: req.body.content,
      title: req.body.title || null,
      first_name: firstName,
      last_name: lastName,
      customer_id: customerId,
      ip_address: ip,
      user_agent: userAgent,
    },
  })

  res.status(201).json({ review })
}
