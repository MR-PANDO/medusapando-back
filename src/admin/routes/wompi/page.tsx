import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { CreditCard, Copy, Check } from "lucide-react"
import { useEffect, useState } from "react"

type WompiPaymentRecord = {
  id: string
  order_id: string
  reference: string
  wompi_status: string
  amount_in_cents: number
  currency: string
  customer_email: string | null
  payment_method_type: string | null
  wompi_checkout_url: string | null
  link_generated_at: string | null
  finalized_at: string | null
}

const STATUS_COLORS: Record<string, "green" | "red" | "orange" | "grey" | "blue"> = {
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })
}

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }
  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-xs"
      title="Copiar link"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  )
}

const WompiPage = () => {
  const [payments, setPayments] = useState<WompiPaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("pending")
  const [managerEmail, setManagerEmail] = useState("")

  const fetchPayments = async () => {
    setLoading(true)
    try {
      const isPending = filter === "pending"
      const url = isPending
        ? "/admin/wompi?pending_only=true"
        : filter === "all"
          ? "/admin/wompi"
          : `/admin/wompi?status=${filter}`
      const res = await fetch(url, { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        setPayments(data.wompi_payments ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    try {
      const res = await fetch("/admin/wompi/settings", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setManagerEmail(data.settings?.paymentManagerEmail ?? "")
      }
    } catch {
      // Settings endpoint may not be available
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [filter])

  useEffect(() => {
    fetchSettings()
  }, [])

  const filters = [
    "pending",
    "approved",
    "declined",
    "voided",
    "error",
    "all",
  ]

  return (
    <div className="flex flex-col gap-y-6">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <CreditCard className="text-ui-fg-subtle" />
            <div>
              <Heading level="h1">Wompi Payments</Heading>
              <Text className="text-ui-fg-subtle">
                Manage Wompi payment links and track transaction statuses
              </Text>
            </div>
          </div>
          <Button size="small" variant="secondary" onClick={fetchPayments}>
            Refresh
          </Button>
        </div>
      </Container>

      {/* Settings */}
      {managerEmail && (
        <Container className="px-6 py-4">
          <Text className="text-ui-fg-subtle text-sm">
            Notificaciones de pago se envian a:{" "}
            <span className="text-ui-fg-base font-medium">{managerEmail}</span>
          </Text>
          <Text className="text-ui-fg-muted text-xs mt-1">
            Configurable via variable de entorno WOMPI_PAYMENT_MANAGER_EMAIL
          </Text>
        </Container>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            size="small"
            variant={filter === f ? "primary" : "secondary"}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Payments table */}
      <Container className="p-0">
        {loading ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">Loading...</Text>
          </div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">No payments found.</Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-ui-fg-subtle">
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Method</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Finalized</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b hover:bg-ui-bg-subtle-hover"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {p.reference}
                    </td>
                    <td className="px-4 py-3">
                      {p.customer_email ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      {formatCOP(p.amount_in_cents)}
                    </td>
                    <td className="px-4 py-3">
                      {p.payment_method_type ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={STATUS_COLORS[p.wompi_status] ?? "grey"}
                      >
                        {p.wompi_status.replace(/_/g, " ").toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ui-fg-subtle">
                      {formatDate(p.link_generated_at)}
                    </td>
                    <td className="px-4 py-3 text-xs text-ui-fg-subtle">
                      {formatDate(p.finalized_at)}
                    </td>
                    <td className="px-4 py-3">
                      {p.wompi_checkout_url ? (
                        <div className="flex items-center gap-2">
                          <CopyButton url={p.wompi_checkout_url} />
                          <a
                            href={p.wompi_checkout_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ui-fg-interactive hover:underline text-xs"
                          >
                            Abrir
                          </a>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Wompi",
  icon: CreditCard,
})

export default WompiPage
