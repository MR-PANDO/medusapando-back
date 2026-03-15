import { model } from "@medusajs/framework/utils"

export const Review = model
  .define("product_review", {
    id: model.id().primaryKey(),
    title: model.text().nullable(),
    content: model.text(),
    rating: model.float(),
    first_name: model.text(),
    last_name: model.text(),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
    product_id: model.text(),
    customer_id: model.text().nullable(),
    ip_address: model.text().nullable(),
    user_agent: model.text().nullable(),
  })
  .indexes([
    {
      on: ["product_id"],
      name: "IDX_product_review_product_id",
    },
    {
      on: ["customer_id"],
      name: "IDX_product_review_customer_id",
    },
    {
      on: ["status"],
      name: "IDX_product_review_status",
    },
  ])
