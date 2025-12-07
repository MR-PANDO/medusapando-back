import { model } from "@medusajs/framework/utils"

// Track page views for visitor analytics
export const PageView = model.define("analytics_page_view", {
  id: model.id().primaryKey(),
  session_id: model.text(), // Anonymous session identifier
  page_path: model.text(), // The URL path visited
  referrer: model.text().nullable(), // Where they came from
  user_agent: model.text().nullable(), // Browser info
  country_code: model.text().nullable(), // Country from request
  customer_id: model.text().nullable(), // If logged in
  viewed_at: model.dateTime(), // When the page was viewed
})
