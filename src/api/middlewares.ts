import {
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"
import { z } from "zod"
import {
  PostAdminCreateBrand,
  PostAdminUpdateBrand,
} from "./admin/brands/validators"
import {
  PostAdminCreateSeo,
  PostAdminUpdateSeo,
} from "./admin/seo/validators"
import {
  PostAdminCreateTranslation,
  PostAdminBatchTranslations,
} from "./admin/translations/validators"
import { PostStoreWishlistItem } from "./store/customers/me/wishlists/items/validators"
import { skuSearchMiddleware } from "./middlewares/sku-search"
import { stableSortMiddleware } from "./middlewares/stable-sort"

export default defineMiddlewares({
  routes: [
    // Stable sort for store product listings (prevents duplicates across pages)
    {
      matcher: "/store/products",
      method: "GET",
      middlewares: [stableSortMiddleware],
    },
    // SKU search middleware for admin product list
    {
      matcher: "/admin/products",
      method: "GET",
      middlewares: [skuSearchMiddleware],
    },
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
    // SEO validation middlewares
    {
      matcher: "/admin/seo",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateSeo)],
    },
    {
      matcher: "/admin/seo/:resource_type/:resource_id",
      method: "PUT",
      middlewares: [validateAndTransformBody(PostAdminUpdateSeo)],
    },
    // Translation validation middlewares
    {
      matcher: "/admin/translations",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminCreateTranslation)],
    },
    {
      matcher: "/admin/translations/batch",
      method: "POST",
      middlewares: [validateAndTransformBody(PostAdminBatchTranslations)],
    },
    // Wishlist - validate add item body
    {
      matcher: "/store/customers/me/wishlists/items",
      method: "POST",
      middlewares: [validateAndTransformBody(PostStoreWishlistItem)],
    },
    // Wompi - ensure body parser is enabled for generate-link
    {
      matcher: "/admin/wompi/generate-link",
      method: "POST",
      bodyParser: { sizeLimit: "1mb" },
    },
  ],
})
