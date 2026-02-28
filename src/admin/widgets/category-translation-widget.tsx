import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  DetailWidgetProps,
  AdminProductCategory,
} from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Text,
  Input,
  Button,
  Select,
  Toaster,
  toast,
  Textarea,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

type Translation = {
  id: string
  entity_type: string
  entity_id: string
  locale: string
  title: string | null
  description: string | null
}

const LOCALES = [
  { value: "en", label: "English" },
]

const CategoryTranslationWidget = ({
  data,
}: DetailWidgetProps<AdminProductCategory>) => {
  const [translations, setTranslations] = useState<Translation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLocale, setSelectedLocale] = useState("en")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const fetchTranslations = async () => {
    try {
      const res = await fetch(
        `/admin/translations/category/${data.id}`,
        { credentials: "include" }
      )
      const result = await res.json()
      setTranslations(result.translations || [])
    } catch (error) {
      console.error("Error fetching translations:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTranslations()
  }, [data.id])

  useEffect(() => {
    const existing = translations.find((t) => t.locale === selectedLocale)
    if (existing) {
      setTitle(existing.title || "")
      setDescription(existing.description || "")
    } else {
      setTitle("")
      setDescription("")
    }
  }, [selectedLocale, translations])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/admin/translations", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entity_type: "category",
          entity_id: data.id,
          locale: selectedLocale,
          title: title || null,
          description: description || null,
        }),
      })

      if (res.ok) {
        toast.success("Translation saved")
        await fetchTranslations()
      } else {
        toast.error("Failed to save translation")
      }
    } catch (error) {
      console.error("Error saving translation:", error)
      toast.error("Failed to save translation")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/admin/translations/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        toast.success("Translation deleted")
        await fetchTranslations()
      } else {
        toast.error("Failed to delete translation")
      }
    } catch (error) {
      console.error("Error deleting translation:", error)
      toast.error("Failed to delete translation")
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Translations</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Loading...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Translations</Heading>
      </div>

      {translations.length > 0 && (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle mb-2 text-sm font-medium">
            Existing translations:
          </Text>
          <div className="flex flex-col gap-2">
            {translations.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between bg-ui-bg-subtle rounded-md p-2"
              >
                <div className="flex-1 min-w-0">
                  <Text className="text-sm font-medium">
                    {t.locale.toUpperCase()}
                  </Text>
                  <Text className="text-xs text-ui-fg-subtle truncate">
                    {t.title || "(no name)"}
                  </Text>
                </div>
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => handleDelete(t.id)}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="px-6 py-4">
        <div className="flex flex-col gap-y-4">
          <div>
            <Text className="text-sm font-medium mb-1">Locale</Text>
            <Select
              value={selectedLocale}
              onValueChange={setSelectedLocale}
            >
              <Select.Trigger>
                <Select.Value placeholder="Select locale" />
              </Select.Trigger>
              <Select.Content>
                {LOCALES.map((locale) => (
                  <Select.Item key={locale.value} value={locale.value}>
                    {locale.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Text className="text-sm font-medium mb-1">Name</Text>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={data.name || "Translated name..."}
            />
          </div>

          <div>
            <Text className="text-sm font-medium mb-1">Description</Text>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Translated description..."
              rows={4}
            />
          </div>

          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Translation"}
          </Button>
        </div>
      </div>
      <Toaster />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategoryTranslationWidget
