import { Input, Label, Textarea, Button } from "@medusajs/ui"
import { Plus, Trash2 } from "lucide-react"
import { SeoMetadataFormData } from "./types"

type GeoTabProps = {
  data: SeoMetadataFormData
  onChange: (field: string, value: any) => void
}

const GeoTab = ({ data, onChange }: GeoTabProps) => {
  const attrs = data.geo_key_attributes || []
  const citations = data.geo_citations || []
  const summaryWords = (data.geo_entity_summary || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return (
    <div className="flex flex-col gap-y-4">
      {/* Entity Summary */}
      <div>
        <Label htmlFor="geo_entity_summary">
          Entity Summary{" "}
          <span
            className={summaryWords >= 50 ? "text-green-600" : "text-gray-400"}
          >
            ({summaryWords} words, need 50+)
          </span>
        </Label>
        <Textarea
          id="geo_entity_summary"
          value={data.geo_entity_summary || ""}
          onChange={(e) => onChange("geo_entity_summary", e.target.value)}
          placeholder="Comprehensive entity description for generative AI engines (50+ words)"
          rows={5}
        />
      </div>

      {/* Key Attributes */}
      <div className="border-t pt-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-ui-fg-base font-semibold">
            Key Attributes ({attrs.length} entries, need 3+)
          </Label>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() =>
              onChange("geo_key_attributes", [
                ...attrs,
                { attribute: "", value: "" },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Attribute
          </Button>
        </div>
        {attrs.map((attr, idx) => (
          <div key={idx} className="flex gap-x-2 mb-2 items-center">
            <Input
              className="flex-1"
              value={attr.attribute}
              onChange={(e) => {
                const updated = [...attrs]
                updated[idx] = { ...updated[idx], attribute: e.target.value }
                onChange("geo_key_attributes", updated)
              }}
              placeholder="Attribute name"
            />
            <Input
              className="flex-1"
              value={attr.value}
              onChange={(e) => {
                const updated = [...attrs]
                updated[idx] = { ...updated[idx], value: e.target.value }
                onChange("geo_key_attributes", updated)
              }}
              placeholder="Value"
            />
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() =>
                onChange(
                  "geo_key_attributes",
                  attrs.filter((_, i) => i !== idx)
                )
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Citations */}
      <div className="border-t pt-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-ui-fg-base font-semibold">
            Citations ({citations.length} entries, need 1+)
          </Label>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() =>
              onChange("geo_citations", [
                ...citations,
                { source: "", url: "" },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Citation
          </Button>
        </div>
        {citations.map((cit, idx) => (
          <div key={idx} className="flex gap-x-2 mb-2 items-center">
            <Input
              className="flex-1"
              value={cit.source}
              onChange={(e) => {
                const updated = [...citations]
                updated[idx] = { ...updated[idx], source: e.target.value }
                onChange("geo_citations", updated)
              }}
              placeholder="Source name"
            />
            <Input
              className="flex-1"
              value={cit.url}
              onChange={(e) => {
                const updated = [...citations]
                updated[idx] = { ...updated[idx], url: e.target.value }
                onChange("geo_citations", updated)
              }}
              placeholder="https://..."
            />
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() =>
                onChange(
                  "geo_citations",
                  citations.filter((_, i) => i !== idx)
                )
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GeoTab
