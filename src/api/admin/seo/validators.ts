import { z } from "zod"

const VALID_RESOURCE_TYPES = ["product", "category", "page"] as const

// ── Helpers ──

/** Accepts a valid URL string or empty string (coerced to null). */
const urlOrEmpty = z
  .string()
  .max(2000)
  .transform((v) => (v === "" ? null : v))
  .pipe(z.string().url().nullable())
  .nullable()
  .optional()

/** Accepts a valid enum value or empty string (coerced to null). */
function enumOrEmpty<T extends [string, ...string[]]>(values: T) {
  return z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.enum(values).nullable())
    .nullable()
    .optional()
}

/** Accepts a string or empty string (coerced to null). */
const stringOrEmpty = (max: number) =>
  z
    .string()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()

// ── Reusable sub-schemas ──

const faqEntry = z.object({
  question: z.string().max(500),
  answer: z.string().max(2000),
})

const howtoStep = z.object({
  name: z.string().max(300),
  text: z.string().max(2000),
  image: z.string().url().max(2000).optional().or(z.literal("")),
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
  seo_title: stringOrEmpty(70),
  seo_description: stringOrEmpty(160),
  seo_keywords: z.array(z.string().max(100)).max(20).nullable().optional(),
  canonical_url: urlOrEmpty,
  robots: stringOrEmpty(100),
  og_title: stringOrEmpty(200),
  og_description: stringOrEmpty(500),
  og_image: urlOrEmpty,
  og_type: stringOrEmpty(50),
  twitter_card: stringOrEmpty(50),
  twitter_title: stringOrEmpty(200),
  twitter_description: stringOrEmpty(500),
  structured_data_type: stringOrEmpty(100),
  structured_data_json: z.record(z.unknown()).nullable().optional(),
  sitemap_priority: z.number().min(0).max(1).nullable().optional(),
  sitemap_changefreq: enumOrEmpty([
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never",
  ]),
  hreflang_entries: z.array(hreflangEntry).max(50).nullable().optional(),

  // AEO
  aeo_faqs: z.array(faqEntry).max(20).nullable().optional(),
  aeo_howto_steps: z.array(howtoStep).max(30).nullable().optional(),
  aeo_short_answer: stringOrEmpty(1000),

  // GEO
  geo_entity_summary: stringOrEmpty(5000),
  geo_citations: z.array(citationEntry).max(20).nullable().optional(),
  geo_key_attributes: z.array(keyAttribute).max(30).nullable().optional(),

  // SXO
  sxo_intent: enumOrEmpty(["informational", "transactional", "navigational"]),
  sxo_cta_text: stringOrEmpty(200),
  sxo_internal_links: z.array(internalLink).max(20).nullable().optional(),
  sxo_cwv_notes: stringOrEmpty(2000),
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
