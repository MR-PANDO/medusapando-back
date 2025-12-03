import { model } from "@medusajs/framework/utils"

// Flexible nutrition info model - stores any nutrition label data as JSON
// Each product can have different nutrition fields since labels vary by product
export const ProductNutrition = model.define("product_nutrition", {
  id: model.id().primaryKey(),
  product_id: model.text().unique(), // Medusa product ID - one nutrition per product

  // Standard serving info
  serving_size: model.text().nullable(), // e.g., "1 cup (300g)", "100g"
  servings_per_container: model.text().nullable(), // e.g., "6", "about 8"

  // Flexible nutrition data - stores ALL fields from the label as key-value pairs
  // This allows any nutrition label format to be stored
  // Example: { "calories": "358", "total_fat": "5%", "sodium": "300mg", ... }
  nutrition_data: model.json().default({}),

  // Raw text extracted from image (for reference/debugging)
  raw_text: model.text().nullable(),

  // Image URL of the scanned label (stored in MinIO)
  label_image_url: model.text().nullable(),

  // Metadata - note: created_at, updated_at, deleted_at are implicit in Medusa models
  scanned_at: model.dateTime().nullable(),
})
