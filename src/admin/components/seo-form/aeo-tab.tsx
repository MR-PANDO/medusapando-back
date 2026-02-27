import { Input, Label, Textarea, Button } from "@medusajs/ui"
import { Plus, Trash2 } from "lucide-react"
import { SeoMetadataFormData } from "./types"

type AeoTabProps = {
  data: SeoMetadataFormData
  onChange: (field: string, value: any) => void
}

const AeoTab = ({ data, onChange }: AeoTabProps) => {
  const faqs = data.aeo_faqs || []
  const howtoSteps = data.aeo_howto_steps || []
  const shortAnswerWords = (data.aeo_short_answer || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  return (
    <div className="flex flex-col gap-y-4">
      {/* FAQs */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-ui-fg-base font-semibold">
            FAQs ({faqs.length} entries, need 2+)
          </Label>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() =>
              onChange("aeo_faqs", [...faqs, { question: "", answer: "" }])
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add FAQ
          </Button>
        </div>
        {faqs.map((faq, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-3 mb-2 flex flex-col gap-y-2"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500">FAQ #{idx + 1}</Label>
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={() =>
                  onChange(
                    "aeo_faqs",
                    faqs.filter((_, i) => i !== idx)
                  )
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={faq.question}
              onChange={(e) => {
                const updated = [...faqs]
                updated[idx] = { ...updated[idx], question: e.target.value }
                onChange("aeo_faqs", updated)
              }}
              placeholder="Question"
            />
            <Textarea
              value={faq.answer}
              onChange={(e) => {
                const updated = [...faqs]
                updated[idx] = { ...updated[idx], answer: e.target.value }
                onChange("aeo_faqs", updated)
              }}
              placeholder="Answer"
              rows={2}
            />
          </div>
        ))}
      </div>

      {/* HowTo Steps */}
      <div className="border-t pt-4 mt-2">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-ui-fg-base font-semibold">
            HowTo Steps ({howtoSteps.length} steps, need 1+)
          </Label>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={() =>
              onChange("aeo_howto_steps", [
                ...howtoSteps,
                { name: "", text: "" },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Step
          </Button>
        </div>
        {howtoSteps.map((step, idx) => (
          <div
            key={idx}
            className="border rounded-lg p-3 mb-2 flex flex-col gap-y-2"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs text-gray-500">Step #{idx + 1}</Label>
              <button
                type="button"
                className="text-red-500 hover:text-red-700"
                onClick={() =>
                  onChange(
                    "aeo_howto_steps",
                    howtoSteps.filter((_, i) => i !== idx)
                  )
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <Input
              value={step.name}
              onChange={(e) => {
                const updated = [...howtoSteps]
                updated[idx] = { ...updated[idx], name: e.target.value }
                onChange("aeo_howto_steps", updated)
              }}
              placeholder="Step name"
            />
            <Textarea
              value={step.text}
              onChange={(e) => {
                const updated = [...howtoSteps]
                updated[idx] = { ...updated[idx], text: e.target.value }
                onChange("aeo_howto_steps", updated)
              }}
              placeholder="Step description"
              rows={2}
            />
            <Input
              value={step.image || ""}
              onChange={(e) => {
                const updated = [...howtoSteps]
                updated[idx] = { ...updated[idx], image: e.target.value }
                onChange("aeo_howto_steps", updated)
              }}
              placeholder="Image URL (optional)"
            />
          </div>
        ))}
      </div>

      {/* Short Answer */}
      <div className="border-t pt-4 mt-2">
        <Label htmlFor="aeo_short_answer">
          Short Answer{" "}
          <span
            className={
              shortAnswerWords >= 40 && shortAnswerWords <= 60
                ? "text-green-600"
                : "text-gray-400"
            }
          >
            ({shortAnswerWords} words, target 40-60)
          </span>
        </Label>
        <Textarea
          id="aeo_short_answer"
          value={data.aeo_short_answer || ""}
          onChange={(e) => onChange("aeo_short_answer", e.target.value)}
          placeholder="Concise answer for AI engines (40-60 words)"
          rows={4}
        />
      </div>
    </div>
  )
}

export default AeoTab
