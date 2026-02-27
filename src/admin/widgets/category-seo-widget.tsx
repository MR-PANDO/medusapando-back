import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProductCategory } from "@medusajs/framework/types"
import SeoForm from "../components/seo-form"

const CategorySeoWidget = ({
  data,
}: DetailWidgetProps<AdminProductCategory>) => {
  return <SeoForm resourceType="category" resourceId={data.id} />
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategorySeoWidget
