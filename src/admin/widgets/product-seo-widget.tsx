import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import SeoForm from "../components/seo-form"

const ProductSeoWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  return <SeoForm resourceType="product" resourceId={data.id} />
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSeoWidget
