import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, Select } from "@medusajs/ui"
import { Mail } from "lucide-react"
import { useEffect, useState } from "react"

type EmailAuditRecord = {
  id: string
  to: string
  from: string
  subject: string
  email_type: string
  status: string
  error: string | null
  metadata: Record<string, any> | null
  sent_at: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, "green" | "red" | "orange" | "grey"> = {
  queued: "orange",
  sent: "green",
  failed: "red",
}

const STATUS_LABELS: Record<string, string> = {
  queued: "En cola",
  sent: "Enviado",
  failed: "Fallido",
}

const TYPE_LABELS: Record<string, string> = {
  "payment-link": "Link de pago",
  "payment-status": "Estado de pago",
  "abandoned-cart": "Carrito abandonado",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })
}

const EmailsPage = () => {
  const [emails, setEmails] = useState<EmailAuditRecord[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const pageSize = 25

  const fetchEmails = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      if (typeFilter) params.set("email_type", typeFilter)
      params.set("limit", String(pageSize))
      params.set("offset", String(page * pageSize))

      const res = await fetch(`/admin/emails?${params.toString()}`, {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setEmails(data.emails ?? [])
        setCount(data.count ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(0)
  }, [statusFilter, typeFilter])

  useEffect(() => {
    fetchEmails()
  }, [statusFilter, typeFilter, page])

  const totalPages = Math.ceil(count / pageSize)

  return (
    <div className="flex flex-col gap-y-6">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <Mail className="text-ui-fg-subtle" />
            <div>
              <Heading level="h1">Correos Enviados</Heading>
              <Text className="text-ui-fg-subtle">
                Historial de correos enviados desde la tienda
              </Text>
            </div>
          </div>
          <Button size="small" variant="secondary" onClick={fetchEmails}>
            Actualizar
          </Button>
        </div>
      </Container>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <Text className="text-sm text-ui-fg-subtle">Estado:</Text>
          <Select size="small" value={statusFilter} onValueChange={setStatusFilter}>
            <Select.Trigger>
              <Select.Value placeholder="Todos" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">Todos</Select.Item>
              <Select.Item value="queued">En cola</Select.Item>
              <Select.Item value="sent">Enviado</Select.Item>
              <Select.Item value="failed">Fallido</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Text className="text-sm text-ui-fg-subtle">Tipo:</Text>
          <Select size="small" value={typeFilter} onValueChange={setTypeFilter}>
            <Select.Trigger>
              <Select.Value placeholder="Todos" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="">Todos</Select.Item>
              <Select.Item value="payment-link">Link de pago</Select.Item>
              <Select.Item value="payment-status">Estado de pago</Select.Item>
              <Select.Item value="abandoned-cart">Carrito abandonado</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <Text className="text-xs text-ui-fg-muted ml-auto">
          {count} correo{count !== 1 ? "s" : ""}
        </Text>
      </div>

      {/* Table */}
      <Container className="p-0">
        {loading ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">Cargando...</Text>
          </div>
        ) : emails.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">No se encontraron correos.</Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-ui-fg-subtle">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Para</th>
                  <th className="px-4 py-3">Asunto</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Enviado</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <>
                    <tr
                      key={email.id}
                      className="border-b hover:bg-ui-bg-subtle-hover cursor-pointer"
                      onClick={() =>
                        setExpandedId(
                          expandedId === email.id ? null : email.id
                        )
                      }
                    >
                      <td className="px-4 py-3 text-xs text-ui-fg-subtle">
                        {formatDate(email.created_at)}
                      </td>
                      <td className="px-4 py-3">{email.to}</td>
                      <td className="px-4 py-3 max-w-[300px] truncate">
                        {email.subject}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color="grey">
                          {TYPE_LABELS[email.email_type] ?? email.email_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          color={STATUS_COLORS[email.status] ?? "grey"}
                        >
                          {STATUS_LABELS[email.status] ?? email.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-ui-fg-subtle">
                        {formatDate(email.sent_at)}
                      </td>
                    </tr>
                    {expandedId === email.id && (
                      <tr key={`${email.id}-detail`} className="border-b bg-ui-bg-subtle">
                        <td colSpan={6} className="px-6 py-4">
                          <div className="flex flex-col gap-2 text-sm">
                            <div>
                              <span className="font-medium">De:</span>{" "}
                              {email.from}
                            </div>
                            {email.error && (
                              <div>
                                <span className="font-medium text-ui-fg-error">
                                  Error:
                                </span>{" "}
                                <span className="text-ui-fg-error">
                                  {email.error}
                                </span>
                              </div>
                            )}
                            {email.metadata && (
                              <div>
                                <span className="font-medium">Metadata:</span>
                                <pre className="mt-1 text-xs bg-ui-bg-base p-2 rounded overflow-auto max-h-32">
                                  {JSON.stringify(email.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t">
            <Button
              size="small"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Text className="text-sm text-ui-fg-subtle">
              Pagina {page + 1} de {totalPages}
            </Text>
            <Button
              size="small"
              variant="secondary"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Correos",
  icon: Mail,
})

export default EmailsPage
