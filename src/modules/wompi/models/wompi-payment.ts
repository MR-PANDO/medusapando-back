import { model } from "@medusajs/framework/utils"

export const WompiPayment = model.define("wompi_payment", {
  id: model.id().primaryKey(),
  order_id: model.text(),
  wompi_payment_link_id: model.text().nullable(),
  wompi_transaction_id: model.text().nullable(),
  wompi_checkout_url: model.text().nullable(),
  reference: model.text(),
  wompi_status: model.text().default("link_generating"),
  amount_in_cents: model.number(),
  currency: model.text().default("COP"),
  payment_method_type: model.text().nullable(),
  payment_method_detail: model.text().nullable(),
  customer_email: model.text().nullable(),
  customer_name: model.text().nullable(),
  customer_phone: model.text().nullable(),
  wompi_reference: model.text().nullable(),
  link_generated_at: model.dateTime().nullable(),
  finalized_at: model.dateTime().nullable(),
  last_webhook_payload: model.json().nullable(),
})
