import SeoModule from "../modules/seo"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  ProductModule.linkable.productCategory,
  SeoModule.linkable.seoMetadata
)
