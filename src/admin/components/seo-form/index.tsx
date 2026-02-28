import { Container, Heading, Button, Toaster, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"
import { SeoMetadataFormData, defaultSeoMetadata } from "./types"
import ScoreBadge from "./score-badge"
import SeoTab from "./seo-tab"
import AeoTab from "./aeo-tab"
import GeoTab from "./geo-tab"
import SxoTab from "./sxo-tab"

type SeoFormProps = {
  resourceType: string
  resourceId: string
  onSave?: () => void
}

const TABS = ["SEO", "AEO", "GEO", "SXO"] as const
type Tab = (typeof TABS)[number]

const SeoForm = ({ resourceType, resourceId, onSave }: SeoFormProps) => {
  const [data, setData] = useState<SeoMetadataFormData>({
    ...defaultSeoMetadata,
    resource_type: resourceType,
    resource_id: resourceId,
  })
  const [activeTab, setActiveTab] = useState<Tab>("SEO")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exists, setExists] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(
          `/admin/seo/${resourceType}/${resourceId}`,
          { credentials: "include" }
        )
        if (res.ok) {
          const json = await res.json()
          setData({
            ...defaultSeoMetadata,
            ...json.seo_metadata,
            resource_type: resourceType,
            resource_id: resourceId,
          })
          setExists(true)
        }
      } catch {
        // Record doesn't exist yet
      } finally {
        setLoading(false)
      }
    }

    if (resourceId) {
      fetchData()
    }
  }, [resourceType, resourceId])

  const handleChange = (field: string, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const method = exists ? "PUT" : "POST"
      const url = exists
        ? `/admin/seo/${resourceType}/${resourceId}`
        : `/admin/seo`

      // Strip read-only / auto-calculated / server-managed fields before sending
      const {
        id: _id,
        resource_type: _rt,
        resource_id: _ri,
        seo_score: _s1,
        aeo_score: _s2,
        geo_score: _s3,
        sxo_score: _s4,
        created_at: _ca,
        updated_at: _ua,
        deleted_at: _da,
        ...editableFields
      } = data as any

      const body = exists
        ? editableFields
        : { ...editableFields, resource_type: resourceType, resource_id: resourceId }

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const json = await res.json()
        setData({
          ...defaultSeoMetadata,
          ...json.seo_metadata,
          resource_type: resourceType,
          resource_id: resourceId,
        })
        setExists(true)
        toast.success("SEO metadata saved")
        onSave?.()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message || "Failed to save SEO metadata")
      }
    } catch (error) {
      toast.error("Failed to save SEO metadata")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4 text-gray-500">Loading SEO data...</div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Heading level="h2">SEO / AEO / GEO / SXO</Heading>
          <div className="flex gap-x-1">
            <ScoreBadge label="SEO" score={data.seo_score} />
            <ScoreBadge label="AEO" score={data.aeo_score} />
            <ScoreBadge label="GEO" score={data.geo_score} />
            <ScoreBadge label="SXO" score={data.sxo_score} />
          </div>
        </div>
        <Button
          variant="primary"
          size="small"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : exists ? "Save" : "Initialize SEO"}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-ui-fg-base text-ui-fg-base"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-6 py-4">
        {activeTab === "SEO" && (
          <SeoTab data={data} onChange={handleChange} />
        )}
        {activeTab === "AEO" && (
          <AeoTab data={data} onChange={handleChange} />
        )}
        {activeTab === "GEO" && (
          <GeoTab data={data} onChange={handleChange} />
        )}
        {activeTab === "SXO" && (
          <SxoTab data={data} onChange={handleChange} />
        )}
      </div>

      <Toaster />
    </Container>
  )
}

export default SeoForm
