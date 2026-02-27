export type SeoMetadataFormData = {
  id?: string
  resource_type: string
  resource_id: string

  // SEO
  seo_title: string
  seo_description: string
  seo_keywords: string[]
  canonical_url: string
  robots: string
  og_title: string
  og_description: string
  og_image: string
  og_type: string
  twitter_card: string
  twitter_title: string
  twitter_description: string
  structured_data_type: string
  structured_data_json: Record<string, any>
  sitemap_priority: number
  sitemap_changefreq: string
  hreflang_entries: { lang: string; url: string }[]

  // AEO
  aeo_faqs: { question: string; answer: string }[]
  aeo_howto_steps: { name: string; text: string; image?: string }[]
  aeo_short_answer: string

  // GEO
  geo_entity_summary: string
  geo_citations: { source: string; url: string }[]
  geo_key_attributes: { attribute: string; value: string }[]

  // SXO
  sxo_intent: string
  sxo_cta_text: string
  sxo_internal_links: { anchor_text: string; target_url: string }[]
  sxo_cwv_notes: string

  // Scores (read-only)
  seo_score: number
  aeo_score: number
  geo_score: number
  sxo_score: number
}

export const defaultSeoMetadata: Omit<
  SeoMetadataFormData,
  "resource_type" | "resource_id"
> = {
  seo_title: "",
  seo_description: "",
  seo_keywords: [],
  canonical_url: "",
  robots: "index,follow",
  og_title: "",
  og_description: "",
  og_image: "",
  og_type: "product",
  twitter_card: "summary_large_image",
  twitter_title: "",
  twitter_description: "",
  structured_data_type: "",
  structured_data_json: {},
  sitemap_priority: 0.5,
  sitemap_changefreq: "weekly",
  hreflang_entries: [],
  aeo_faqs: [],
  aeo_howto_steps: [],
  aeo_short_answer: "",
  geo_entity_summary: "",
  geo_citations: [],
  geo_key_attributes: [],
  sxo_intent: "",
  sxo_cta_text: "",
  sxo_internal_links: [],
  sxo_cwv_notes: "",
  seo_score: 0,
  aeo_score: 0,
  geo_score: 0,
  sxo_score: 0,
}
