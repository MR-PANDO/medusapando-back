import WishlistModule from "../modules/wishlist"
import ProductModule from "@medusajs/medusa/product"
import { defineLink } from "@medusajs/framework/utils"

export default defineLink(
  {
    linkable: WishlistModule.linkable.wishlistItem,
    field: "product_variant_id",
  },
  ProductModule.linkable.productVariant,
  {
    readOnly: true,
  }
)
