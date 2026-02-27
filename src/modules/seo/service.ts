import { MedusaService } from "@medusajs/framework/utils"
import { SeoMetadata } from "./models/seo-metadata"

class SeoModuleService extends MedusaService({
  SeoMetadata,
}) {
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

  async upsertSeoMetadata(
    input: Record<string, any>
  ): Promise<Record<string, any>> {
    const { resource_type, resource_id, ...fields } = input

    // Look for existing record
    const existing = await this.listSeoMetadatas(
      {
        resource_type,
        resource_id,
      },
      { take: 1 }
    )

    if (existing && existing.length > 0) {
      const record = existing[0]
      // Merge fields
      const merged = { ...record, ...fields, resource_type, resource_id }
      const scores = this.calculateScores(merged)

      const updated = await this.updateSeoMetadatas({
        id: record.id,
        ...fields,
        ...scores,
      })

      return updated
    }

    // Create new - provide defaults for nullable json fields
    const newData = {
      resource_type,
      resource_id,
      seo_keywords: [],
      structured_data_json: {},
      hreflang_entries: [],
      aeo_faqs: [],
      aeo_howto_steps: [],
      geo_citations: [],
      geo_key_attributes: [],
      sxo_internal_links: [],
      ...fields,
    }
    const scores = this.calculateScores(newData)

    const created = await this.createSeoMetadatas({
      ...newData,
      ...scores,
    })

    return created
  }
}

export default SeoModuleService
