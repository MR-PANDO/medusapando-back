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
} from "@medusajs/ui"
import { CreditCard } from "lucide-react"
import { useEffect, useState } from "react"

type WompiPaymentRecord = {
  id: string
  order_id: string
  reference: string
  wompi_transaction_id: string | null
  wompi_status: string
  amount_in_cents: number
  currency: string
  customer_email: string | null
  customer_name: string | null
  customer_phone: string | null
  wompi_checkout_url: string | null
  wompi_reference: string | null
  payment_method_type: string | null
  payment_method_detail: string | null
  link_generated_at: string | null
  finalized_at: string | null
  last_webhook_payload: any
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

const STATUS_LABELS: Record<string, string> = {
  link_generating: "Generando link",
  link_ready: "Link listo",
  pending: "Pendiente",
  approved: "Aprobada",
  declined: "Rechazada",
  voided: "Anulada",
  error: "Error",
}

function formatCOP(cents: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString("es-CO", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const InfoRow = ({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) => (
  <div className="flex justify-between text-sm gap-x-4">
    <Text className="text-ui-fg-subtle whitespace-nowrap">{label}</Text>
    <Text
      className={`text-right ${mono ? "font-mono text-xs" : ""}`}
    >
      {value}
    </Text>
  </div>
)

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

  // Get checkout URL from payment record or order metadata
  const checkoutUrl =
    payment?.wompi_checkout_url ||
    data?.metadata?.wompi_checkout_url ||
    null

  const showLink =
    payment &&
    ["link_ready", "pending"].includes(payment.wompi_status) &&
    checkoutUrl

  // Extract extra details from webhook payload if available
  const webhookTx = payment?.last_webhook_payload?.data?.transaction
  const paymentMethodDisplay =
    payment?.payment_method_detail ??
    (webhookTx?.payment_method?.extra?.last_four
      ? `${webhookTx.payment_method.extra.brand ?? webhookTx.payment_method_type} •••• ${webhookTx.payment_method.extra.last_four}`
      : payment?.payment_method_type) ??
    null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-2">
          <CreditCard size={18} className="text-ui-fg-subtle" />
          <Heading level="h2">Wompi</Heading>
        </div>
        {payment && (
          <Badge color={STATUS_COLORS[payment.wompi_status] ?? "grey"}>
            {STATUS_LABELS[payment.wompi_status] ??
              payment.wompi_status.replace(/_/g, " ").toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Cargando...</Text>
        ) : payment ? (
          <div className="flex flex-col gap-y-2.5">
            {/* Amount */}
            <InfoRow
              label="Monto"
              value={formatCOP(payment.amount_in_cents)}
            />

            {/* Transaction ID */}
            {payment.wompi_transaction_id && (
              <InfoRow
                label="Transaccion #"
                value={payment.wompi_transaction_id}
                mono
              />
            )}

            {/* Wompi Reference */}
            {(payment.wompi_reference || payment.reference) && (
              <InfoRow
                label="Referencia"
                value={payment.wompi_reference || payment.reference}
                mono
              />
            )}

            {/* Payment Method */}
            {paymentMethodDisplay && (
              <InfoRow label="Medio de pago" value={paymentMethodDisplay} />
            )}

            {/* Customer Info */}
            {(payment.customer_name || webhookTx?.customer_data?.full_name) && (
              <InfoRow
                label="Cliente"
                value={
                  payment.customer_name ??
                  webhookTx?.customer_data?.full_name ??
                  ""
                }
              />
            )}

            {payment.customer_email && (
              <InfoRow label="Email" value={payment.customer_email} />
            )}

            {(payment.customer_phone ||
              webhookTx?.customer_data?.phone_number) && (
              <InfoRow
                label="Telefono"
                value={
                  payment.customer_phone ??
                  webhookTx?.customer_data?.phone_number ??
                  ""
                }
              />
            )}

            {/* Dates */}
            {payment.link_generated_at && (
              <InfoRow
                label="Link generado"
                value={formatDate(payment.link_generated_at)}
              />
            )}

            {payment.finalized_at && (
              <InfoRow
                label="Finalizado"
                value={formatDate(payment.finalized_at)}
              />
            )}

            {/* Payment Link Section */}
            {showLink && (
              <div className="mt-2 flex flex-col gap-y-2 pt-2 border-t border-ui-border-base">
                <Text className="text-ui-fg-subtle text-xs">
                  Link de pago:
                </Text>
                <div className="flex items-center gap-x-2">
                  <code className="text-xs bg-ui-bg-subtle px-2 py-1 rounded flex-1 truncate">
                    {checkoutUrl}
                  </code>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(checkoutUrl!)
                      toast.success("Link copiado")
                    }}
                  >
                    Copiar
                  </Button>
                </div>
                <a
                  href={checkoutUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ui-fg-interactive hover:underline text-xs"
                >
                  Abrir link de pago
                </a>
              </div>
            )}

            {/* Generate new link button */}
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
