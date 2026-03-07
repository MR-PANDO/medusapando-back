import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, Input, Label } from "@medusajs/ui"
import { Mail, Settings, Pencil, Check, X } from "lucide-react"
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

type SmtpSettingsData = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
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
  "order-placed": "Confirmacion de pedido",
  "order-shipped": "Pedido enviado",
  "order-canceled": "Pedido cancelado",
  "order-refund": "Reembolso",
  "customer-welcome": "Bienvenida",
  "password-reset": "Restablecer contrasena",
  "invite-user": "Invitacion de usuario",
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })
}

/* ─── SMTP Settings Panel ─── */

function SmtpSettingsPanel() {
  const [settings, setSettings] = useState<SmtpSettingsData>({
    host: "",
    port: 465,
    secure: true,
    user: "",
    pass: "",
    from: "",
  })
  const [editing, setEditing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const fetchSettings = async () => {
    try {
      const res = await fetch("/admin/emails/settings", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setSettings(data.settings)
          setLoaded(true)
        }
      }
    } catch {}
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setError("")
    setSuccess("")
    if (!settings.host || !settings.user || !settings.pass || !settings.from) {
      setError("Todos los campos son obligatorios")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/admin/emails/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      if (res.ok) {
        setEditing(false)
        setSuccess("Configuracion guardada")
        setTimeout(() => setSuccess(""), 3000)
        fetchSettings()
      } else {
        const data = await res.json()
        setError(data.error || "Error al guardar")
      }
    } catch {
      setError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setError("")
    fetchSettings()
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Settings className="text-ui-fg-subtle" size={20} />
          <div>
            <Heading level="h2" className="text-base">
              Configuracion SMTP
            </Heading>
            <Text className="text-ui-fg-subtle text-sm">
              Proveedor de correo electronico
            </Text>
          </div>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button
                size="small"
                variant="secondary"
                onClick={handleCancel}
                disabled={saving}
              >
                <X size={14} />
                Cancelar
              </Button>
              <Button
                size="small"
                variant="primary"
                onClick={handleSave}
                disabled={saving}
              >
                <Check size={14} />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </>
          ) : (
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                setEditing(true)
                // Clear masked password when entering edit mode
                if (loaded) {
                  setSettings((s) => ({ ...s, pass: "" }))
                }
              }}
            >
              <Pencil size={14} />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {error && (
          <div className="mb-4 p-3 bg-ui-bg-subtle-hover rounded text-ui-fg-error text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-ui-bg-subtle-hover rounded text-green-700 text-sm">
            {success}
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="smtp-host">Host</Label>
            <Input
              id="smtp-host"
              placeholder="smtp.gmail.com"
              value={settings.host}
              onChange={(e) =>
                setSettings((s) => ({ ...s, host: e.target.value }))
              }
              disabled={!editing}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtp-port">Puerto</Label>
              <Input
                id="smtp-port"
                type="number"
                placeholder="465"
                value={String(settings.port)}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    port: Number(e.target.value) || 465,
                  }))
                }
                disabled={!editing}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="smtp-secure"
                type="checkbox"
                checked={settings.secure}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, secure: e.target.checked }))
                }
                disabled={!editing}
                className="h-4 w-4"
              />
              <Label htmlFor="smtp-secure">SSL/TLS</Label>
            </div>
          </div>
          <div>
            <Label htmlFor="smtp-user">Usuario</Label>
            <Input
              id="smtp-user"
              placeholder="correo@dominio.com"
              value={settings.user}
              onChange={(e) =>
                setSettings((s) => ({ ...s, user: e.target.value }))
              }
              disabled={!editing}
            />
          </div>
          <div>
            <Label htmlFor="smtp-pass">Contrasena</Label>
            <Input
              id="smtp-pass"
              type="password"
              placeholder={editing ? "Ingrese la contrasena" : "********"}
              value={settings.pass}
              onChange={(e) =>
                setSettings((s) => ({ ...s, pass: e.target.value }))
              }
              disabled={!editing}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="smtp-from">
              Remitente (From)
            </Label>
            <Input
              id="smtp-from"
              placeholder="Tienda <correo@dominio.com>"
              value={settings.from}
              onChange={(e) =>
                setSettings((s) => ({ ...s, from: e.target.value }))
              }
              disabled={!editing}
            />
          </div>
        </div>
        {!loaded && !editing && (
          <Text className="text-ui-fg-muted text-sm mt-3">
            No hay configuracion guardada. Se usan las variables de entorno.
          </Text>
        )}
      </div>
    </Container>
  )
}

/* ─── Emails Page ─── */

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
      {/* SMTP Settings */}
      <SmtpSettingsPanel />

      {/* Email History Header */}
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

      {/* Status Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <Text className="text-sm text-ui-fg-subtle">Estado:</Text>
          {[
            { key: "", label: "Todos" },
            { key: "queued", label: "En cola" },
            { key: "sent", label: "Enviado" },
            { key: "failed", label: "Fallido" },
          ].map((f) => (
            <Button
              key={f.key}
              size="small"
              variant={statusFilter === f.key ? "primary" : "secondary"}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Text className="text-sm text-ui-fg-subtle">Tipo:</Text>
          {[
            { key: "", label: "Todos" },
            { key: "payment-link", label: "Link de pago" },
            { key: "payment-status", label: "Estado de pago" },
            { key: "abandoned-cart", label: "Carrito abandonado" },
            { key: "order-placed", label: "Confirmacion pedido" },
            { key: "order-shipped", label: "Pedido enviado" },
            { key: "order-canceled", label: "Pedido cancelado" },
            { key: "order-refund", label: "Reembolso" },
            { key: "password-reset", label: "Contrasena" },
            { key: "customer-welcome", label: "Bienvenida" },
            { key: "invite-user", label: "Invitacion" },
          ].map((f) => (
            <Button
              key={f.key}
              size="small"
              variant={typeFilter === f.key ? "primary" : "secondary"}
              onClick={() => setTypeFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
          <Text className="text-xs text-ui-fg-muted ml-auto">
            {count} correo{count !== 1 ? "s" : ""}
          </Text>
        </div>
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
