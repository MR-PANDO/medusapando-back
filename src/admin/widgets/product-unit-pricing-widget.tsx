import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Input, Select, Button, Toaster, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type UnitPricing = {
  unit_type: string // g, kg, ml, L, oz, lb, unit, etc.
  unit_amount: number // amount of units in the product (e.g., 500 for 500g)
  base_unit_amount: number // base amount to display price for (e.g., 100 for "price per 100g")
}

const UNIT_TYPES = [
  { value: "g", label: "Gramos (g)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "ml", label: "Mililitros (ml)" },
  { value: "L", label: "Litros (L)" },
  { value: "oz", label: "Onzas (oz)" },
  { value: "lb", label: "Libras (lb)" },
  { value: "unit", label: "Unidad" },
  { value: "capsule", label: "Cápsula" },
  { value: "tablet", label: "Tableta" },
  { value: "serving", label: "Porción" },
]

const ProductUnitPricingWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [unitPricing, setUnitPricing] = useState<UnitPricing>({
    unit_type: "g",
    unit_amount: 0,
    base_unit_amount: 100,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch current unit pricing
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/admin/products/${data.id}/unit-pricing`, {
          credentials: "include",
        })
        if (res.ok) {
          const result = await res.json()
          if (result.unit_pricing) {
            setUnitPricing(result.unit_pricing)
          }
        }
      } catch (error) {
        console.error("Error fetching unit pricing:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [data.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/admin/products/${data.id}/unit-pricing`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ unit_pricing: unitPricing }),
      })

      if (res.ok) {
        toast.success("Precio por unidad guardado")
      } else {
        toast.error("Error al guardar")
      }
    } catch (error) {
      console.error("Error saving unit pricing:", error)
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  // Calculate price per unit for display
  const calculatePricePerUnit = () => {
    if (!unitPricing.unit_amount || unitPricing.unit_amount === 0) return null

    // Get the first variant's price (simplified)
    const variant = data.variants?.[0]
    if (!variant) return null

    // We'll show a placeholder - actual calculation happens on frontend with real prices
    return `Precio por ${unitPricing.base_unit_amount}${unitPricing.unit_type}`
  }

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Precio por Unidad</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle">Cargando...</Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Precio por Unidad</Heading>
      </div>
      <div className="px-6 py-4">
        <div className="flex flex-col gap-y-4">
          <div>
            <Text className="text-ui-fg-subtle mb-2 text-sm">
              Tipo de unidad
            </Text>
            <Select
              value={unitPricing.unit_type}
              onValueChange={(value) => setUnitPricing({ ...unitPricing, unit_type: value })}
            >
              <Select.Trigger className="w-full">
                <Select.Value placeholder="Seleccionar unidad" />
              </Select.Trigger>
              <Select.Content>
                {UNIT_TYPES.map((unit) => (
                  <Select.Item key={unit.value} value={unit.value}>
                    {unit.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>

          <div>
            <Text className="text-ui-fg-subtle mb-2 text-sm">
              Cantidad en el producto (ej: 500 para 500g)
            </Text>
            <Input
              type="number"
              placeholder="500"
              value={unitPricing.unit_amount || ""}
              onChange={(e) => setUnitPricing({ ...unitPricing, unit_amount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <Text className="text-ui-fg-subtle mb-2 text-sm">
              Mostrar precio por (ej: 100 para "precio por 100g")
            </Text>
            <Input
              type="number"
              placeholder="100"
              value={unitPricing.base_unit_amount || ""}
              onChange={(e) => setUnitPricing({ ...unitPricing, base_unit_amount: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {unitPricing.unit_amount > 0 && (
            <div className="bg-ui-bg-subtle p-3 rounded-lg">
              <Text className="text-ui-fg-subtle text-sm">
                Se mostrará: <strong>{calculatePricePerUnit()}</strong>
              </Text>
            </div>
          )}

          <Button
            variant="secondary"
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </div>
      <Toaster />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductUnitPricingWidget
