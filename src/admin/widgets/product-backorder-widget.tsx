import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Badge, Switch } from "@medusajs/ui"
import { useEffect, useState } from "react"

const BackorderWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [allowBackorder, setAllowBackorder] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [variantCount, setVariantCount] = useState(0)
  const [backorderCount, setBackorderCount] = useState(0)

  useEffect(() => {
    const fetchStatus = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `/admin/products/${data.id}/variants?limit=100&fields=id,allow_backorder`,
          { credentials: "include" }
        )
        if (res.ok) {
          const json = await res.json()
          const variants = json.variants || []
          setVariantCount(variants.length)
          const withBackorder = variants.filter(
            (v: any) => v.allow_backorder
          ).length
          setBackorderCount(withBackorder)
          setAllowBackorder(
            variants.length > 0 && withBackorder === variants.length
          )
        }
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [data.id])

  const handleToggle = async (checked: boolean) => {
    setSaving(true)
    try {
      const res = await fetch(
        `/admin/products/${data.id}/backorder`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ allow_backorder: checked }),
        }
      )
      if (res.ok) {
        const json = await res.json()
        setAllowBackorder(checked)
        setBackorderCount(checked ? variantCount : 0)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2" className="text-base">
            Venta sin stock
          </Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">Cargando...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-2">
          <Heading level="h2" className="text-base">
            Venta sin stock
          </Heading>
          <Badge color={allowBackorder ? "green" : "grey"}>
            {allowBackorder ? "Activo" : "Inactivo"}
          </Badge>
        </div>
        <Text className="text-ui-fg-subtle text-xs mb-3">
          Permite comprar este producto cuando no hay inventario disponible.
          Ideal para productos que se reabastecen diariamente.
        </Text>
        <div className="flex items-center justify-between">
          <Text className="text-sm">
            Permitir venta sin stock
            <span className="text-ui-fg-muted text-xs ml-1">
              ({variantCount} variante{variantCount !== 1 ? "s" : ""})
            </span>
          </Text>
          <Switch
            checked={allowBackorder}
            onCheckedChange={handleToggle}
            disabled={saving || variantCount === 0}
          />
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default BackorderWidget
