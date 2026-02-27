import { Input, Label, Textarea, Select } from "@medusajs/ui"
import { SeoMetadataFormData } from "./types"

type SeoTabProps = {
  data: SeoMetadataFormData
  onChange: (field: string, value: any) => void
}

const SeoTab = ({ data, onChange }: SeoTabProps) => {
  const titleLen = (data.seo_title || "").length
  const descLen = (data.seo_description || "").length

  return (
    <div className="flex flex-col gap-y-4">
      {/* Title */}
      <div>
        <Label htmlFor="seo_title">
          SEO Title{" "}
          <span className={titleLen > 70 ? "text-red-500" : "text-gray-400"}>
            ({titleLen}/70)
          </span>
        </Label>
        <Input
          id="seo_title"
          value={data.seo_title || ""}
          onChange={(e) => onChange("seo_title", e.target.value)}
          placeholder="Page title for search engines"
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="seo_description">
          Meta Description{" "}
          <span className={descLen > 160 ? "text-red-500" : "text-gray-400"}>
            ({descLen}/160)
          </span>
        </Label>
        <Textarea
          id="seo_description"
          value={data.seo_description || ""}
          onChange={(e) => onChange("seo_description", e.target.value)}
          placeholder="Brief description for search results"
          rows={3}
        />
      </div>

      {/* Keywords */}
      <div>
        <Label htmlFor="seo_keywords">Keywords (comma-separated)</Label>
        <Input
          id="seo_keywords"
          value={(data.seo_keywords || []).join(", ")}
          onChange={(e) =>
            onChange(
              "seo_keywords",
              e.target.value
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean)
            )
          }
          placeholder="keyword1, keyword2, keyword3"
        />
      </div>

      {/* Canonical URL */}
      <div>
        <Label htmlFor="canonical_url">Canonical URL</Label>
        <Input
          id="canonical_url"
          value={data.canonical_url || ""}
          onChange={(e) => onChange("canonical_url", e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Robots */}
      <div>
        <Label htmlFor="robots">Robots</Label>
        <Select
          value={data.robots || "index,follow"}
          onValueChange={(v) => onChange("robots", v)}
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="index,follow">index, follow</Select.Item>
            <Select.Item value="noindex,follow">noindex, follow</Select.Item>
            <Select.Item value="index,nofollow">index, nofollow</Select.Item>
            <Select.Item value="noindex,nofollow">
              noindex, nofollow
            </Select.Item>
          </Select.Content>
        </Select>
      </div>

      {/* Open Graph */}
      <div className="border-t pt-4 mt-2">
        <Label className="text-ui-fg-base font-semibold mb-3 block">
          Open Graph
        </Label>
        <div className="flex flex-col gap-y-3">
          <div>
            <Label htmlFor="og_title">OG Title</Label>
            <Input
              id="og_title"
              value={data.og_title || ""}
              onChange={(e) => onChange("og_title", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="og_description">OG Description</Label>
            <Textarea
              id="og_description"
              value={data.og_description || ""}
              onChange={(e) => onChange("og_description", e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="og_image">OG Image URL</Label>
            <Input
              id="og_image"
              value={data.og_image || ""}
              onChange={(e) => onChange("og_image", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div>
            <Label htmlFor="og_type">OG Type</Label>
            <Select
              value={data.og_type || "product"}
              onValueChange={(v) => onChange("og_type", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="product">product</Select.Item>
                <Select.Item value="website">website</Select.Item>
                <Select.Item value="article">article</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      </div>

      {/* Twitter */}
      <div className="border-t pt-4 mt-2">
        <Label className="text-ui-fg-base font-semibold mb-3 block">
          Twitter Card
        </Label>
        <div className="flex flex-col gap-y-3">
          <div>
            <Label htmlFor="twitter_card">Card Type</Label>
            <Select
              value={data.twitter_card || "summary_large_image"}
              onValueChange={(v) => onChange("twitter_card", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="summary_large_image">
                  summary_large_image
                </Select.Item>
                <Select.Item value="summary">summary</Select.Item>
              </Select.Content>
            </Select>
          </div>
          <div>
            <Label htmlFor="twitter_title">Twitter Title</Label>
            <Input
              id="twitter_title"
              value={data.twitter_title || ""}
              onChange={(e) => onChange("twitter_title", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="twitter_description">Twitter Description</Label>
            <Textarea
              id="twitter_description"
              value={data.twitter_description || ""}
              onChange={(e) => onChange("twitter_description", e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Structured Data */}
      <div className="border-t pt-4 mt-2">
        <Label className="text-ui-fg-base font-semibold mb-3 block">
          Structured Data
        </Label>
        <div className="flex flex-col gap-y-3">
          <div>
            <Label htmlFor="structured_data_type">Schema Type</Label>
            <Input
              id="structured_data_type"
              value={data.structured_data_type || ""}
              onChange={(e) => onChange("structured_data_type", e.target.value)}
              placeholder="Product, Article, etc."
            />
          </div>
          <div>
            <Label htmlFor="structured_data_json">JSON-LD (raw JSON)</Label>
            <Textarea
              id="structured_data_json"
              value={
                typeof data.structured_data_json === "object" &&
                Object.keys(data.structured_data_json || {}).length > 0
                  ? JSON.stringify(data.structured_data_json, null, 2)
                  : ""
              }
              onChange={(e) => {
                try {
                  const parsed = e.target.value
                    ? JSON.parse(e.target.value)
                    : {}
                  onChange("structured_data_json", parsed)
                } catch {
                  // Allow invalid JSON while typing
                }
              }}
              rows={5}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Sitemap */}
      <div className="border-t pt-4 mt-2">
        <Label className="text-ui-fg-base font-semibold mb-3 block">
          Sitemap
        </Label>
        <div className="flex gap-x-4">
          <div className="flex-1">
            <Label htmlFor="sitemap_priority">Priority (0-1)</Label>
            <Input
              id="sitemap_priority"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={data.sitemap_priority ?? 0.5}
              onChange={(e) =>
                onChange("sitemap_priority", parseFloat(e.target.value))
              }
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="sitemap_changefreq">Change Frequency</Label>
            <Select
              value={data.sitemap_changefreq || "weekly"}
              onValueChange={(v) => onChange("sitemap_changefreq", v)}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="always">always</Select.Item>
                <Select.Item value="hourly">hourly</Select.Item>
                <Select.Item value="daily">daily</Select.Item>
                <Select.Item value="weekly">weekly</Select.Item>
                <Select.Item value="monthly">monthly</Select.Item>
                <Select.Item value="yearly">yearly</Select.Item>
                <Select.Item value="never">never</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SeoTab
