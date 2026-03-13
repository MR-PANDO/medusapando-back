import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"

type VariantMatch = {
  variant_id: string
  variant_title: string
  sku: string
  erp_matched: boolean
  erp_price: number | null
  erp_quantity: number | null
}

type SyncInfo = {
  configured: boolean
  last_sync: {
    status: string
    started_at: string
    finished_at: string | null
    duration_ms: number
    errors: number
  } | null
  variants: VariantMatch[]
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })
}

function formatPrice(price: number | null): string {
  if (price == null) return "-"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(price)
}

const STATUS_COLORS: Record<string, "green" | "red" | "orange" | "grey"> = {
  completed: "green",
  failed: "red",
  running: "orange",
}

const STATUS_LABELS: Record<string, string> = {
  completed: "Completado",
  failed: "Fallido",
  running: "En proceso",
}

const ProductNubexWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
  const [info, setInfo] = useState<SyncInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await fetch(`/admin/nubex/product/${data.id}`, {
          credentials: "include",
        })
        if (res.ok) {
          setInfo(await res.json())
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchInfo()
  }, [data.id])

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Nubex ERP</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-subtle text-sm">Cargando...</Text>
        </div>
      </Container>
    )
  }

  if (!info || !info.configured) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Nubex ERP</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-muted text-sm">
            ERP no configurado
          </Text>
        </div>
      </Container>
    )
  }

  const matchedCount = info.variants.filter((v) => v.erp_matched).length

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Nubex ERP</Heading>
        {info.last_sync && (
          <Badge color={STATUS_COLORS[info.last_sync.status] ?? "grey"}>
            {STATUS_LABELS[info.last_sync.status] ?? info.last_sync.status}
          </Badge>
        )}
      </div>

      {/* Last sync info */}
      <div className="px-6 py-3">
        <Text className="text-ui-fg-subtle text-xs uppercase mb-1">
          Ultima sincronizacion
        </Text>
        <Text className="text-sm">
          {info.last_sync ? formatDate(info.last_sync.started_at) : "Nunca"}
        </Text>
        {info.last_sync && info.last_sync.errors > 0 && (
          <Text className="text-ui-fg-error text-xs mt-1">
            {info.last_sync.errors} error(es) en la ultima sync
          </Text>
        )}
      </div>

      {/* Variant matches */}
      <div className="px-6 py-3">
        <Text className="text-ui-fg-subtle text-xs uppercase mb-2">
          Variantes ({matchedCount}/{info.variants.length} coinciden con ERP)
        </Text>
        {info.variants.length === 0 ? (
          <Text className="text-ui-fg-muted text-sm">Sin variantes</Text>
        ) : (
          <div className="flex flex-col gap-y-2">
            {info.variants.map((v) => (
              <div
                key={v.variant_id}
                className="flex items-center justify-between text-sm border rounded px-3 py-2"
              >
                <div className="flex flex-col min-w-0">
                  <Text className="text-sm font-medium truncate">
                    {v.sku || "Sin SKU"}
                  </Text>
                  <Text className="text-xs text-ui-fg-subtle truncate">
                    {v.variant_title}
                  </Text>
                </div>
                {v.erp_matched ? (
                  <div className="flex flex-col items-end shrink-0 ml-2">
                    <Text className="text-xs text-ui-fg-subtle">
                      {formatPrice(v.erp_price)}
                    </Text>
                    <Text className="text-xs text-ui-fg-subtle">
                      Cant: {v.erp_quantity ?? 0}
                    </Text>
                  </div>
                ) : (
                  <Badge color="grey" className="shrink-0 ml-2">
                    No ERP
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductNubexWidget
