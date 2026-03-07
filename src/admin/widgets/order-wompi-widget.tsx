import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps } from "@medusajs/framework/types"
import {
  Container,
  Heading,
  Text,
  Button,
  Badge,
  toast,
  Toaster,
  Copy,
} from "@medusajs/ui"
import { CreditCard } from "lucide-react"
import { useEffect, useState } from "react"

type WompiPaymentRecord = {
  id: string
  order_id: string
  reference: string
  wompi_status: string
  amount_in_cents: number
  customer_email: string | null
  wompi_checkout_url: string | null
  payment_method_type: string | null
  link_generated_at: string | null
  finalized_at: string | null
}

const STATUS_COLORS: Record<
  string,
  "green" | "red" | "orange" | "grey" | "blue" | "purple"
> = {
  link_generating: "grey",
  link_ready: "blue",
  pending: "orange",
  approved: "green",
  declined: "red",
  voided: "grey",
  error: "red",
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

const OrderWompiWidget = ({ data }: DetailWidgetProps<any>) => {
  const [payment, setPayment] = useState<WompiPaymentRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const fetchPayment = async () => {
    try {
      const res = await fetch(`/admin/wompi?pending_only=false`, {
        credentials: "include",
      })
      if (res.ok) {
        const result = await res.json()
        const records = result.wompi_payments || []
        const match = records.find(
          (p: WompiPaymentRecord) => p.order_id === data.id
        )
        setPayment(match || null)
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayment()
  }, [data.id])

  const handleGenerateLink = async () => {
    setGenerating(true)
    try {
      const res = await fetch("/admin/wompi/generate-link", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: data.id }),
      })

      const result = await res.json()

      if (res.ok) {
        setPayment(result.wompi_payment)
        toast.success("Link de pago generado y enviado al cliente")
      } else if (res.status === 409) {
        setPayment(result.wompi_payment)
        toast.warning("Ya existe un link de pago para este pedido")
      } else {
        toast.error(result.error || "Error al generar el link de pago")
      }
    } catch {
      toast.error("Error de conexion al generar el link")
    } finally {
      setGenerating(false)
    }
  }

  const canGenerate =
    !payment ||
    ["error", "declined", "voided"].includes(payment.wompi_status)

  const showLink =
    payment &&
    ["link_ready", "pending"].includes(payment.wompi_status) &&
    payment.wompi_checkout_url

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <CreditCard size={18} className="text-ui-fg-subtle" />
          <Heading level="h2">Wompi</Heading>
        </div>
        {payment && (
          <Badge color={STATUS_COLORS[payment.wompi_status] ?? "grey"}>
            {payment.wompi_status.replace(/_/g, " ").toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Cargando...</Text>
        ) : payment ? (
          <div className="flex flex-col gap-y-3">
            <div className="flex justify-between text-sm">
              <Text className="text-ui-fg-subtle">Monto</Text>
              <Text className="font-medium">
                {formatCOP(payment.amount_in_cents)}
              </Text>
            </div>

            {payment.payment_method_type && (
              <div className="flex justify-between text-sm">
                <Text className="text-ui-fg-subtle">Metodo</Text>
                <Text>{payment.payment_method_type}</Text>
              </div>
            )}

            {payment.customer_email && (
              <div className="flex justify-between text-sm">
                <Text className="text-ui-fg-subtle">Cliente</Text>
                <Text>{payment.customer_email}</Text>
              </div>
            )}

            {payment.finalized_at && (
              <div className="flex justify-between text-sm">
                <Text className="text-ui-fg-subtle">Finalizado</Text>
                <Text>
                  {new Date(payment.finalized_at).toLocaleString("es-CO", {
                    timeZone: "America/Bogota",
                  })}
                </Text>
              </div>
            )}

            {showLink && (
              <div className="mt-2 flex flex-col gap-y-2">
                <Text className="text-ui-fg-subtle text-xs">
                  Link de pago:
                </Text>
                <div className="flex items-center gap-x-2">
                  <code className="text-xs bg-ui-bg-subtle px-2 py-1 rounded flex-1 truncate">
                    {payment.wompi_checkout_url}
                  </code>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        payment.wompi_checkout_url!
                      )
                      toast.success("Link copiado")
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <a
                  href={payment.wompi_checkout_url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ui-fg-interactive hover:underline text-xs"
                >
                  Abrir link de pago
                </a>
              </div>
            )}

            {canGenerate && (
              <Button
                className="mt-2"
                variant="primary"
                onClick={handleGenerateLink}
                isLoading={generating}
              >
                Generar nuevo link de pago
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-y-3">
            <Text className="text-ui-fg-subtle text-sm">
              No hay link de pago para este pedido.
            </Text>
            <Button
              variant="primary"
              onClick={handleGenerateLink}
              isLoading={generating}
            >
              Generar link de pago
            </Button>
          </div>
        )}
      </div>

      <Toaster />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderWompiWidget
