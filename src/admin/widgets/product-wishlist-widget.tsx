import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"

const ProductWishlistWidget = ({
  data,
}: DetailWidgetProps<AdminProduct>) => {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch(`/store/products/${data.id}/wishlist`)
        if (res.ok) {
          const json = await res.json()
          setCount(json.count ?? 0)
        } else {
          setCount(0)
        }
      } catch (error) {
        console.error("Error fetching wishlist count:", error)
        setCount(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCount()
  }, [data.id])

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Wishlist</Heading>
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
        <Heading level="h2">Wishlist</Heading>
      </div>
      <div className="px-6 py-4">
        <Text className="text-ui-fg-subtle">
          This product is in{" "}
          <span className="text-ui-fg-base font-semibold">{count}</span>{" "}
          wishlist{count !== 1 ? "s" : ""}
        </Text>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductWishlistWidget
