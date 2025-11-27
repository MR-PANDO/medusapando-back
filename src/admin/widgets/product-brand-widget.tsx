import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Select, Button, Toaster, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Brand = {
  id: string
  name: string
  handle: string | null
}

type ProductBrandLink = {
  product_id: string
  brand_id: string
  brand?: Brand
}

const ProductBrandWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string>("__none__")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch all brands and current product's brand
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all brands and links in parallel
        const [brandsRes, linksRes] = await Promise.all([
          fetch("/admin/brands?limit=1000", { credentials: "include" }),
          fetch("/admin/product-brand-links", { credentials: "include" }),
        ])

        const brandsData = await brandsRes.json()
        const allBrands = brandsData.brands || []
        setBrands(allBrands)

        const linksData = await linksRes.json()
        const links = linksData.links || []

        // Find the link for this product
        const productLink = links.find((link: ProductBrandLink) => link.product_id === data.id)

        if (productLink && productLink.brand_id) {
          const linkedBrand = allBrands.find((b: Brand) => b.id === productLink.brand_id)
          if (linkedBrand) {
            setCurrentBrand(linkedBrand)
            setSelectedBrandId(linkedBrand.id)
          }
        }
      } catch (error) {
        console.error("Error fetching brand data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [data.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/admin/products/${data.id}/brand`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ brand_id: selectedBrandId === "__none__" ? null : selectedBrandId }),
      })

      if (res.ok) {
        const result = await res.json()
        setCurrentBrand(result.brand || null)
        toast.success("Brand updated successfully")
      } else {
        toast.error("Failed to update brand")
      }
    } catch (error) {
      console.error("Error saving brand:", error)
      toast.error("Failed to update brand")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Brand</Heading>
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
        <Heading level="h2">Brand</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-y-4">
          <div>
            <Text className="text-ui-fg-subtle mb-2">
              Current Brand: {currentBrand?.name || "None"}
            </Text>
          </div>
          <div className="flex gap-x-2">
            <Select
              value={selectedBrandId}
              onValueChange={setSelectedBrandId}
            >
              <Select.Trigger className="flex-1">
                <Select.Value placeholder="Select a brand" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="__none__">No Brand</Select.Item>
                {brands.map((brand) => (
                  <Select.Item key={brand.id} value={brand.id}>
                    {brand.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Button
              variant="secondary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>
      <Toaster />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductBrandWidget
