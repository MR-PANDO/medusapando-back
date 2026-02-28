import { z } from "zod"

const VALID_RESOURCE_TYPES = ["product", "category", "page"] as const

// ── Reusable sub-schemas ──

const faqEntry = z.object({
  question: z.string().max(500),
  answer: z.string().max(2000),
})

const howtoStep = z.object({
  name: z.string().max(300),
  text: z.string().max(2000),
  image: z.string().url().max(2000).optional(),
})

const hreflangEntry = z.object({
  lang: z.string().max(10),
  url: z.string().url().max(2000),
})

const citationEntry = z.object({
  source: z.string().max(300),
  url: z.string().url().max(2000),
})

const keyAttribute = z.object({
  attribute: z.string().max(200),
  value: z.string().max(500),
})

const internalLink = z.object({
  anchor_text: z.string().max(200),
  target_url: z.string().max(2000),
})

// ── SEO field schemas (all optional for shared use) ──

const seoFields = {
  // SEO
  seo_title: z.string().max(70).nullable().optional(),
  seo_description: z.string().max(160).nullable().optional(),
  seo_keywords: z.array(z.string().max(100)).max(20).nullable().optional(),
  canonical_url: z.string().url().max(2000).nullable().optional(),
  robots: z.string().max(100).nullable().optional(),
  og_title: z.string().max(200).nullable().optional(),
  og_description: z.string().max(500).nullable().optional(),
  og_image: z.string().url().max(2000).nullable().optional(),
  og_type: z.string().max(50).nullable().optional(),
  twitter_card: z.string().max(50).nullable().optional(),
  twitter_title: z.string().max(200).nullable().optional(),
  twitter_description: z.string().max(500).nullable().optional(),
  structured_data_type: z.string().max(100).nullable().optional(),
  structured_data_json: z.record(z.unknown()).nullable().optional(),
  sitemap_priority: z.number().min(0).max(1).nullable().optional(),
  sitemap_changefreq: z
    .enum(["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"])
    .nullable()
    .optional(),
  hreflang_entries: z.array(hreflangEntry).max(50).nullable().optional(),

  // AEO
  aeo_faqs: z.array(faqEntry).max(20).nullable().optional(),
  aeo_howto_steps: z.array(howtoStep).max(30).nullable().optional(),
  aeo_short_answer: z.string().max(1000).nullable().optional(),

  // GEO
  geo_entity_summary: z.string().max(5000).nullable().optional(),
  geo_citations: z.array(citationEntry).max(20).nullable().optional(),
  geo_key_attributes: z.array(keyAttribute).max(30).nullable().optional(),

  // SXO
  sxo_intent: z
    .enum(["informational", "transactional", "navigational"])
    .nullable()
    .optional(),
  sxo_cta_text: z.string().max(200).nullable().optional(),
  sxo_internal_links: z.array(internalLink).max(20).nullable().optional(),
  sxo_cwv_notes: z.string().max(2000).nullable().optional(),
}

// ── POST /admin/seo — create/upsert (resource_type + resource_id required) ──

export const PostAdminCreateSeo = z.object({
  resource_type: z.enum(VALID_RESOURCE_TYPES),
  resource_id: z.string().min(1).max(200),
  ...seoFields,
})

// ── PUT /admin/seo/:resource_type/:resource_id — update (all fields optional) ──

export const PostAdminUpdateSeo = z.object({
  ...seoFields,
})

export type PostAdminCreateSeoType = z.infer<typeof PostAdminCreateSeo>
export type PostAdminUpdateSeoType = z.infer<typeof PostAdminUpdateSeo>
