import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "zod"
import {
  PostAdminCreateBrand,
  PostAdminUpdateBrand,
} from "./admin/brands/validators"

export default defineMiddlewares({
  routes: [
    // Brand validation middlewares
    {
      matcher: "/admin/brands",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateBrand)],
    },
    {
      matcher: "/admin/brands/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminUpdateBrand)],
    },
    // Allow brand_id in additional_data when creating products
    {
      matcher: "/admin/products",
      method: ["POST"],
      additionalDataValidator: {
        brand_id: z.string().optional(),
      },
    },
    // Nutrition scan - allow large base64 images (up to 10MB)
    {
      matcher: "/admin/nutrition/:productId/scan",
      method: "POST",
      bodyParser: { sizeLimit: "10mb" },
    },
  ],
})
