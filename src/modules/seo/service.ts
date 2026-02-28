import { MedusaService } from "@medusajs/framework/utils"
import { SeoMetadata } from "./models/seo-metadata"

class SeoModuleService extends MedusaService({
  SeoMetadata,
}) {
  // ─── Manual CRUD overrides ──────────────────────────────────────────
  // MedusaService types these as properties but fails to generate
  // runtime implementations. We override them in the constructor.

  constructor(container: Record<string, any>, ...rest: any[]) {
    super(container, ...rest)

    const internalService = container["seoMetadataService"]
    const baseRepo = (this as any).baseRepository_

    if (!internalService) {
      const keys = Object.keys(container).filter(
        (k) =>
          k.toLowerCase().includes("seo") ||
          k.toLowerCase().includes("metadata")
      )
      console.error(
        `[SEO Module] seoMetadataService not found. Related keys: [${keys.join(", ")}]`
      )
      return
    }

    const serialize = async (data: any) => baseRepo.serialize(data)

    ;(this as any).listSeoMetadatas = async (
      filters: any = {},
      config: any = {}
    ) => {
      const results = await internalService.list(filters, config)
      return await serialize(results)
    }

    ;(this as any).listAndCountSeoMetadatas = async (
      filters: any = {},
      config: any = {}
    ) => {
      const [results, count] = await internalService.listAndCount(
        filters,
        config
      )
      return [await serialize(results), count]
    }

    ;(this as any).retrieveSeoMetadata = async (
      id: string,
      config: any = {}
    ) => {
      const result = await internalService.retrieve(id, config)
      return await serialize(result)
    }

    ;(this as any).createSeoMetadatas = async (data: any) => {
      const result = await internalService.create(data)
      return await serialize(result)
    }

    ;(this as any).updateSeoMetadatas = async (data: any) => {
      const result = await internalService.update(data)
      return await serialize(result)
    }

    ;(this as any).deleteSeoMetadatas = async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids]
      await internalService.delete(idArray)
    }
  }

  // ─── Score Calculation ─────────────────────────────────────────────

  calculateScores(data: Record<string, any>): {
    seo_score: number
    aeo_score: number
    geo_score: number
    sxo_score: number
  } {
    let seo_score = 0
    let aeo_score = 0
    let geo_score = 0
    let sxo_score = 0

    // SEO Score (max 100)
    if (data.seo_title && data.seo_title.length <= 70) seo_score += 15
    if (data.seo_description && data.seo_description.length <= 160)
      seo_score += 15
    const keywords = data.seo_keywords || []
    if (Array.isArray(keywords) && keywords.length >= 1) seo_score += 10
    if (data.canonical_url) seo_score += 10
    if (data.og_title && data.og_description && data.og_image) seo_score += 15
    if (data.twitter_card && data.twitter_title && data.twitter_description)
      seo_score += 10
    const sdJson = data.structured_data_json
    if (
      sdJson &&
      typeof sdJson === "object" &&
      Object.keys(sdJson).length > 0
    )
      seo_score += 15
    if (
      data.sitemap_priority !== undefined &&
      data.sitemap_priority !== null &&
      data.sitemap_changefreq
    )
      seo_score += 5
    const hreflang = data.hreflang_entries || []
    if (Array.isArray(hreflang) && hreflang.length > 0) seo_score += 5

    // AEO Score (max 100)
    const faqs = data.aeo_faqs || []
    if (Array.isArray(faqs) && faqs.length >= 2) aeo_score += 40
    const howto = data.aeo_howto_steps || []
    if (Array.isArray(howto) && howto.length >= 1) aeo_score += 30
    if (data.aeo_short_answer) {
      const wordCount = data.aeo_short_answer.trim().split(/\s+/).length
      if (wordCount >= 40 && wordCount <= 60) aeo_score += 30
    }

    // GEO Score (max 100)
    if (data.geo_entity_summary) {
      const wordCount = data.geo_entity_summary.trim().split(/\s+/).length
      if (wordCount >= 50) geo_score += 40
    }
    const attrs = data.geo_key_attributes || []
    if (Array.isArray(attrs) && attrs.length >= 3) geo_score += 30
    const citations = data.geo_citations || []
    if (Array.isArray(citations) && citations.length >= 1) geo_score += 30

    // SXO Score (max 100)
    if (data.sxo_intent) sxo_score += 25
    if (data.sxo_cta_text) sxo_score += 25
    const links = data.sxo_internal_links || []
    if (Array.isArray(links) && links.length >= 2) sxo_score += 25
    if (data.sxo_cwv_notes) sxo_score += 25

    return { seo_score, aeo_score, geo_score, sxo_score }
  }

  // ─── Field Allowlist (defense-in-depth) ─────────────────────────────

  private static ALLOWED_FIELDS = new Set([
    "seo_title",
    "seo_description",
    "seo_keywords",
    "canonical_url",
    "robots",
    "og_title",
    "og_description",
    "og_image",
    "og_type",
    "twitter_card",
    "twitter_title",
    "twitter_description",
    "structured_data_type",
    "structured_data_json",
    "sitemap_priority",
    "sitemap_changefreq",
    "hreflang_entries",
    "aeo_faqs",
    "aeo_howto_steps",
    "aeo_short_answer",
    "geo_entity_summary",
    "geo_citations",
    "geo_key_attributes",
    "sxo_intent",
    "sxo_cta_text",
    "sxo_internal_links",
    "sxo_cwv_notes",
  ])

  private sanitizeFields(input: Record<string, any>): Record<string, any> {
    const clean: Record<string, any> = {}
    for (const [key, value] of Object.entries(input)) {
      if (SeoModuleService.ALLOWED_FIELDS.has(key)) {
        clean[key] = value
      }
    }
    return clean
  }

  // ─── Upsert ────────────────────────────────────────────────────────

  async upsertSeoMetadata(
    input: Record<string, any>
  ): Promise<Record<string, any>> {
    const { resource_type, resource_id, ...rawFields } = input
    const fields = this.sanitizeFields(rawFields)

    const existing = await (this as any).listSeoMetadatas(
      { resource_type, resource_id },
      { take: 1 }
    )

    if (existing && existing.length > 0) {
      const record = existing[0]
      const merged = { ...record, ...fields, resource_type, resource_id }
      const scores = this.calculateScores(merged)

      const updated = await (this as any).updateSeoMetadatas({
        id: record.id,
        ...fields,
        ...scores,
      })

      return updated
    }

    // Create new
    const newData = {
      resource_type,
      resource_id,
      ...fields,
    }
    const scores = this.calculateScores(newData)

    const created = await (this as any).createSeoMetadatas({
      ...newData,
      ...scores,
    })

    return created
  }
}

export default SeoModuleService
