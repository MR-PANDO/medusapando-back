import { Input, Label, Textarea, Select, Button } from "@medusajs/ui"
import { Plus, Trash2 } from "lucide-react"
import { SeoMetadataFormData } from "./types"

type SxoTabProps = {
  data: SeoMetadataFormData
  onChange: (field: string, value: any) => void
}

const SxoTab = ({ data, onChange }: SxoTabProps) => {
  const links = data.sxo_internal_links || []

  return (
    <div className="flex flex-col gap-y-4">
      {/* Intent */}
      <div>
        <Label htmlFor="sxo_intent">Search Intent</Label>
        <Select
          value={data.sxo_intent || ""}
          onValueChange={(v) => onChange("sxo_intent", v)}
        >
          <Select.Trigger>
            <Select.Value placeholder="Select intent type" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="informational">Informational</Select.Item>
            <Select.Item value="transactional">Transactional</Select.Item>
            <Select.Item value="navigational">Navigational</Select.Item>
          </Select.Content>
        </Select>
      </div>

      {/* CTA Text */}
      <div>
        <Label htmlFor="sxo_cta_text">CTA Text</Label>
        <Input
          id="sxo_cta_text"
          value={data.sxo_cta_text || ""}
          onChange={(e) => onChange("sxo_cta_text", e.target.value)}
          placeholder="e.g., Buy Now, Learn More, Get Started"
        />
      </div>

      {/* Internal Links */}
      <div className="border-t pt-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-ui-fg-base font-semibold">
            Internal Links ({links.length} links, need 2+)
          </Label>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() =>
              onChange("sxo_internal_links", [
                ...links,
                { anchor_text: "", target_url: "" },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Link
          </Button>
        </div>
        {links.map((link, idx) => (
          <div key={idx} className="flex gap-x-2 mb-2 items-center">
            <Input
              className="flex-1"
              value={link.anchor_text}
              onChange={(e) => {
                const updated = [...links]
                updated[idx] = {
                  ...updated[idx],
                  anchor_text: e.target.value,
                }
                onChange("sxo_internal_links", updated)
              }}
              placeholder="Anchor text"
            />
            <Input
              className="flex-1"
              value={link.target_url}
              onChange={(e) => {
                const updated = [...links]
                updated[idx] = {
                  ...updated[idx],
                  target_url: e.target.value,
                }
                onChange("sxo_internal_links", updated)
              }}
              placeholder="/target-url"
            />
            <button
              type="button"
              className="text-red-500 hover:text-red-700"
              onClick={() =>
                onChange(
                  "sxo_internal_links",
                  links.filter((_, i) => i !== idx)
                )
              }
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* CWV Notes */}
      <div className="border-t pt-4 mt-2">
        <Label htmlFor="sxo_cwv_notes">
          Core Web Vitals Notes (internal only)
        </Label>
        <Textarea
          id="sxo_cwv_notes"
          value={data.sxo_cwv_notes || ""}
          onChange={(e) => onChange("sxo_cwv_notes", e.target.value)}
          placeholder="Internal notes about Core Web Vitals optimizations"
          rows={3}
        />
      </div>
    </div>
  )
}

export default SxoTab
