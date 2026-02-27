import { model } from "@medusajs/framework/utils"

export const SeoMetadata = model.define("seo_metadata", {
  id: model.id().primaryKey(),

  // Identification
  resource_type: model.text(),
  resource_id: model.text(),

  // SEO Fields
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  seo_keywords: model.json().nullable(),
  canonical_url: model.text().nullable(),
  robots: model.text().default("index,follow"),
  og_title: model.text().nullable(),
  og_description: model.text().nullable(),
  og_image: model.text().nullable(),
  og_type: model.text().default("product"),
  twitter_card: model.text().default("summary_large_image"),
  twitter_title: model.text().nullable(),
  twitter_description: model.text().nullable(),
  structured_data_type: model.text().nullable(),
  structured_data_json: model.json().nullable(),
  sitemap_priority: model.number().default(0),
  sitemap_changefreq: model.text().default("weekly"),
  hreflang_entries: model.json().nullable(),

  // AEO Fields
  aeo_faqs: model.json().nullable(),
  aeo_howto_steps: model.json().nullable(),
  aeo_short_answer: model.text().nullable(),

  // GEO Fields
  geo_entity_summary: model.text().nullable(),
  geo_citations: model.json().nullable(),
  geo_key_attributes: model.json().nullable(),

  // SXO Fields
  sxo_intent: model.text().nullable(),
  sxo_cta_text: model.text().nullable(),
  sxo_internal_links: model.json().nullable(),
  sxo_cwv_notes: model.text().nullable(),

  // Scores (auto-calculated)
  seo_score: model.number().default(0),
  aeo_score: model.number().default(0),
  geo_score: model.number().default(0),
  sxo_score: model.number().default(0),
})
