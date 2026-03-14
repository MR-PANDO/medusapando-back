import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button, Input, Label, Switch } from "@medusajs/ui"
import { RefreshCw, Server, ChevronDown, ChevronRight, Bell, Pencil } from "lucide-react"
import { useEffect, useState } from "react"

type SyncLog = {
  id: string
  status: string
  trigger: string
  total_erp_products: number
  matched_skus: number
  prices_updated: number
  inventory_updated: number
  inventory_created: number
  products_published: number
  products_unpublished: number
  errors: number
  error_details: string | null
  duration_ms: number
  started_at: string
  finished_at: string | null
  created_at: string
}

type SyncDetail = {
  id: string
  product_id: string
  product_title: string
  variant_id: string
  variant_title: string
  sku: string
  price_changed: boolean
  old_price: number | null
  new_price: number | null
  qty_changed: boolean
  old_qty: number | null
  new_qty: number | null
  status_changed: boolean
  old_status: string | null
  new_status: string | null
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleString("es-CO", {
    timeZone: "America/Bogota",
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}min`
}

function formatPrice(amount: number | null): string {
  if (amount === null) return "-"
  return `$${amount.toLocaleString("es-CO")}`
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

const COL_COUNT = 12

// Group details by product for display
function groupByProduct(details: SyncDetail[]): Map<string, SyncDetail[]> {
  const map = new Map<string, SyncDetail[]>()
  for (const d of details) {
    const key = d.product_id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(d)
  }
  return map
}

const SyncDetailsPanel = ({ syncLogId }: { syncLogId: string }) => {
  const [details, setDetails] = useState<SyncDetail[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(
          `/admin/nubex/sync-details?sync_log_id=${syncLogId}`,
          { credentials: "include" }
        )
        if (res.ok) {
          const data = await res.json()
          setDetails(data.details ?? [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchDetails()
  }, [syncLogId])

  if (loading) {
    return (
      <Text className="text-ui-fg-subtle text-sm py-2">
        Cargando cambios...
      </Text>
    )
  }

  if (details.length === 0) {
    return (
      <Text className="text-ui-fg-muted text-sm py-2">
        Sin cambios registrados en esta sincronizacion.
      </Text>
    )
  }

  const grouped = groupByProduct(details)

  return (
    <div className="flex flex-col gap-y-2 max-h-96 overflow-y-auto">
      {[...grouped.entries()].map(([productId, variants]) => {
        const productTitle = variants[0]?.product_title || productId
        return (
          <div
            key={productId}
            className="bg-ui-bg-base border rounded p-3"
          >
            <Text className="text-sm font-medium mb-2">{productTitle}</Text>
            <div className="flex flex-col gap-y-1">
              {variants.map((v) => (
                <div
                  key={v.id}
                  className="text-xs py-2 border-t first:border-t-0"
                >
                  <div className="flex items-center gap-x-2 mb-1">
                    <span className="text-ui-fg-subtle font-mono">
                      SKU: {v.sku}
                    </span>
                    {v.variant_title && (
                      <span className="text-ui-fg-muted truncate">
                        {v.variant_title}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-y-1 mt-1">
                    {v.price_changed && (
                      <div className="flex items-center gap-x-2">
                        <Badge color="blue" className="text-xs">Precio</Badge>
                        <span className="text-ui-fg-error line-through">
                          {formatPrice(v.old_price)}
                        </span>
                        <span className="text-ui-fg-subtle">→</span>
                        <span className="text-green-600 font-medium">
                          {formatPrice(v.new_price)}
                        </span>
                      </div>
                    )}
                    {v.qty_changed && (
                      <div className="flex items-center gap-x-2">
                        <Badge color="purple" className="text-xs">Inventario</Badge>
                        <span className="text-ui-fg-error">
                          {v.old_qty ?? 0}
                        </span>
                        <span className="text-ui-fg-subtle">→</span>
                        <span className="text-green-600 font-medium">
                          {v.new_qty ?? 0}
                        </span>
                      </div>
                    )}
                    {v.status_changed && (
                      <div className="flex items-center gap-x-2">
                        <Badge
                          color={v.new_status === "published" ? "green" : "orange"}
                          className="text-xs"
                        >
                          {v.new_status === "published" ? "Publicado" : "Despublicado"}
                        </Badge>
                        <span className="text-ui-fg-error">
                          {v.old_status === "published" ? "Publicado" : "Borrador"}
                        </span>
                        <span className="text-ui-fg-subtle">→</span>
                        <span className="text-green-600 font-medium">
                          {v.new_status === "published" ? "Publicado" : "Borrador"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

const SyncLogRow = ({ log }: { log: SyncLog }) => {
  const [expanded, setExpanded] = useState(false)
  const hasChanges =
    log.prices_updated > 0 ||
    log.inventory_updated > 0 ||
    log.inventory_created > 0 ||
    log.products_published > 0 ||
    log.products_unpublished > 0 ||
    log.errors > 0 ||
    log.status === "failed"

  return (
    <>
      <tr
        className={`border-b hover:bg-ui-bg-subtle-hover ${hasChanges ? "cursor-pointer" : ""}`}
        onClick={() => hasChanges && setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs">
          {hasChanges && (
            expanded
              ? <ChevronDown size={14} className="inline mr-1 text-ui-fg-subtle" />
              : <ChevronRight size={14} className="inline mr-1 text-ui-fg-subtle" />
          )}
          <span className="text-ui-fg-subtle">{formatDate(log.started_at)}</span>
        </td>
        <td className="px-4 py-3">
          <Badge color="grey">
            {log.trigger === "manual" ? "Manual" : "Programado"}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <Badge color={STATUS_COLORS[log.status] ?? "grey"}>
            {STATUS_LABELS[log.status] ?? log.status}
          </Badge>
        </td>
        <td className="px-4 py-3">{log.total_erp_products}</td>
        <td className="px-4 py-3">{log.matched_skus}</td>
        <td className="px-4 py-3">{log.prices_updated}</td>
        <td className="px-4 py-3">{log.inventory_created}</td>
        <td className="px-4 py-3">{log.inventory_updated}</td>
        <td className="px-4 py-3">
          {log.products_published > 0 ? (
            <span className="text-green-600 font-medium">{log.products_published}</span>
          ) : "0"}
        </td>
        <td className="px-4 py-3">
          {log.products_unpublished > 0 ? (
            <span className="text-orange-600 font-medium">{log.products_unpublished}</span>
          ) : "0"}
        </td>
        <td className="px-4 py-3">
          {log.errors > 0 ? (
            <span className="text-ui-fg-error font-medium">{log.errors}</span>
          ) : (
            "0"
          )}
        </td>
        <td className="px-4 py-3 text-xs">{formatDuration(log.duration_ms)}</td>
      </tr>
      {expanded && (
        <tr className="border-b bg-ui-bg-subtle">
          <td colSpan={COL_COUNT} className="px-6 py-4">
            <div className="flex flex-col gap-y-3">
              {/* Detail summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <Text className="text-ui-fg-subtle text-xs uppercase">Inicio</Text>
                  <Text className="text-sm">{formatDate(log.started_at)}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-xs uppercase">Fin</Text>
                  <Text className="text-sm">{formatDate(log.finished_at)}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-xs uppercase">Duracion</Text>
                  <Text className="text-sm">{formatDuration(log.duration_ms)}</Text>
                </div>
                <div>
                  <Text className="text-ui-fg-subtle text-xs uppercase">SKUs sin coincidencia</Text>
                  <Text className="text-sm">
                    {log.total_erp_products - log.matched_skus}
                  </Text>
                </div>
              </div>

              {/* Progress bars */}
              <div className="flex flex-col gap-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <Text className="text-ui-fg-subtle">Coincidencia SKU</Text>
                    <Text className="text-ui-fg-subtle">
                      {log.matched_skus}/{log.total_erp_products}
                      {log.total_erp_products > 0
                        ? ` (${Math.round((log.matched_skus / log.total_erp_products) * 100)}%)`
                        : ""}
                    </Text>
                  </div>
                  <div className="w-full bg-ui-bg-base rounded h-2 overflow-hidden border">
                    <div
                      className="bg-blue-500 h-full rounded"
                      style={{
                        width: `${log.total_erp_products > 0 ? (log.matched_skus / log.total_erp_products) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Product changes */}
              <div>
                <Text className="text-ui-fg-subtle text-xs uppercase mb-2 font-medium">
                  Cambios por producto
                </Text>
                <SyncDetailsPanel syncLogId={log.id} />
              </div>

              {/* Error details */}
              {log.error_details && (
                <div>
                  <Text className="text-ui-fg-error text-xs uppercase mb-1 font-medium">
                    Detalle de errores
                  </Text>
                  <pre className="bg-ui-bg-base border rounded p-3 text-xs text-ui-fg-error whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                    {log.error_details}
                  </pre>
                </div>
              )}

              {log.status === "failed" && !log.error_details && (
                <div className="p-3 bg-ui-bg-base border rounded">
                  <Text className="text-ui-fg-error text-sm">
                    La sincronizacion fallo sin detalles de error registrados.
                  </Text>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

type NubexSettingsData = {
  low_stock_threshold: number
  notification_email: string | null
  low_stock_enabled: boolean
}

const LowStockSettings = () => {
  const [settings, setSettings] = useState<NubexSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [threshold, setThreshold] = useState(5)
  const [email, setEmail] = useState("")
  const [enabled, setEnabled] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/nubex/settings", { credentials: "include" })
      if (res.ok) {
        const data = await res.json()
        const s = data.settings as NubexSettingsData | null
        setSettings(s)
        if (s) {
          setThreshold(s.low_stock_threshold)
          setEmail(s.notification_email ?? "")
          setEnabled(s.low_stock_enabled)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleCancel = () => {
    setEditing(false)
    setSaveMsg(null)
    setSaveError(null)
    if (settings) {
      setThreshold(settings.low_stock_threshold)
      setEmail(settings.notification_email ?? "")
      setEnabled(settings.low_stock_enabled)
    } else {
      setThreshold(5)
      setEmail("")
      setEnabled(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)
    setSaveError(null)
    try {
      const res = await fetch("/admin/nubex/settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          low_stock_threshold: threshold,
          notification_email: email || null,
          low_stock_enabled: enabled,
        }),
      })
      if (res.ok) {
        setSaveMsg("Configuracion guardada correctamente")
        setEditing(false)
        fetchSettings()
      } else {
        const data = await res.json()
        setSaveError(data.error || "Error al guardar")
      }
    } catch {
      setSaveError("Error de conexion")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <Bell className="text-ui-fg-subtle" size={20} />
          <div>
            <Heading level="h2" className="text-base">
              Alertas de inventario bajo
            </Heading>
            <Text className="text-ui-fg-subtle text-xs">
              Recibe notificaciones por correo cuando el stock baje del limite
            </Text>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {!loading && settings?.low_stock_enabled && (
            <Badge color="green">Activo</Badge>
          )}
          {!loading && !settings?.low_stock_enabled && (
            <Badge color="grey">Inactivo</Badge>
          )}
          {!editing && (
            <Button
              size="small"
              variant="secondary"
              onClick={() => {
                setEditing(true)
                setSaveMsg(null)
                setSaveError(null)
              }}
            >
              <Pencil size={14} />
              Editar
            </Button>
          )}
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle text-sm">Cargando...</Text>
        ) : (
          <div className="flex flex-col gap-y-4">
            {saveMsg && (
              <div className="p-3 bg-ui-bg-subtle-hover rounded text-green-700 text-sm">
                {saveMsg}
              </div>
            )}
            {saveError && (
              <div className="p-3 bg-ui-bg-subtle-hover rounded text-ui-fg-error text-sm">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-y-1">
                <Label htmlFor="threshold" className="text-xs text-ui-fg-subtle uppercase">
                  Limite de stock
                </Label>
                {editing ? (
                  <Input
                    id="threshold"
                    type="number"
                    min={1}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    placeholder="5"
                  />
                ) : (
                  <Text className="text-sm font-medium py-2">
                    {settings?.low_stock_threshold ?? 5} unidades
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-y-1">
                <Label htmlFor="notification_email" className="text-xs text-ui-fg-subtle uppercase">
                  Email de notificacion
                </Label>
                {editing ? (
                  <Input
                    id="notification_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="inventario@ejemplo.com"
                  />
                ) : (
                  <Text className="text-sm font-medium py-2">
                    {settings?.notification_email || (
                      <span className="text-ui-fg-muted">No configurado</span>
                    )}
                  </Text>
                )}
              </div>

              <div className="flex flex-col gap-y-1">
                <Label className="text-xs text-ui-fg-subtle uppercase">
                  Notificaciones
                </Label>
                {editing ? (
                  <div className="flex items-center gap-x-2 py-2">
                    <Switch
                      checked={enabled}
                      onCheckedChange={setEnabled}
                    />
                    <Text className="text-sm">
                      {enabled ? "Activadas" : "Desactivadas"}
                    </Text>
                  </div>
                ) : (
                  <Text className="text-sm font-medium py-2">
                    {settings?.low_stock_enabled ? (
                      <span className="text-green-600">Activadas</span>
                    ) : (
                      <span className="text-ui-fg-muted">Desactivadas</span>
                    )}
                  </Text>
                )}
              </div>
            </div>

            {editing && (
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  size="small"
                  variant="secondary"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button
                  size="small"
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            )}

            {!editing && settings?.low_stock_enabled && (
              <Text className="text-ui-fg-subtle text-xs">
                Se enviara una alerta a <strong>{settings.notification_email}</strong> cuando
                algun producto tenga menos de <strong>{settings.low_stock_threshold}</strong> unidades
                despues de cada sincronizacion con el ERP.
              </Text>
            )}
          </div>
        )}
      </div>
    </Container>
  )
}

const NubexPage = () => {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [configured, setConfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/nubex?limit=50", {
        credentials: "include",
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs ?? [])
        setConfigured(data.configured ?? false)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    setSyncError(null)
    try {
      const res = await fetch("/admin/nubex/sync", {
        method: "POST",
        credentials: "include",
      })
      const data = await res.json()
      if (res.ok) {
        const r = data.result
        setSyncResult(
          `Sincronizados: ${r.prices_updated} precios, ${r.inventory_created} inv. creados, ${r.inventory_updated} inv. actualizados. ` +
            `Publicados: ${r.products_published}, Despublicados: ${r.products_unpublished}. ` +
            `SKUs coincidentes: ${r.matched_skus}/${r.total_erp_products}. ` +
            `Errores: ${r.errors}. Duracion: ${formatDuration(r.duration_ms)}`
        )
        fetchLogs()
      } else {
        setSyncError(data.error || "Error al sincronizar")
      }
    } catch {
      setSyncError("Error de conexion")
    } finally {
      setSyncing(false)
    }
  }

  const lastSync = logs[0]
  const failedCount = logs.filter((l) => l.status === "failed").length
  const errorCount = logs.filter((l) => l.errors > 0).length

  return (
    <div className="flex flex-col gap-y-6">
      {/* Status Card */}
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <Server className="text-ui-fg-subtle" size={20} />
            <div>
              <Heading level="h1">Nubex ERP</Heading>
              <Text className="text-ui-fg-subtle">
                Sincronizacion de precios e inventario
              </Text>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {configured ? (
              <Badge color="green">Configurado</Badge>
            ) : (
              <Badge color="red">No configurado</Badge>
            )}
            <Button
              size="small"
              variant="primary"
              onClick={handleSync}
              disabled={syncing || !configured}
            >
              <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Sincronizando..." : "Sincronizar ahora"}
            </Button>
          </div>
        </div>

        {/* Last sync summary */}
        <div className="px-6 py-4">
          {syncResult && (
            <div className="mb-4 p-3 bg-ui-bg-subtle-hover rounded text-green-700 text-sm">
              {syncResult}
            </div>
          )}
          {syncError && (
            <div className="mb-4 p-3 bg-ui-bg-subtle-hover rounded text-ui-fg-error text-sm">
              {syncError}
            </div>
          )}

          {lastSync ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <Text className="text-ui-fg-subtle text-xs uppercase">
                  Ultima sincronizacion
                </Text>
                <Text className="text-sm font-medium">
                  {formatDate(lastSync.started_at)}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-xs uppercase">
                  Estado
                </Text>
                <Badge color={STATUS_COLORS[lastSync.status] ?? "grey"}>
                  {STATUS_LABELS[lastSync.status] ?? lastSync.status}
                </Badge>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-xs uppercase">
                  SKUs coincidentes
                </Text>
                <Text className="text-sm font-medium">
                  {lastSync.matched_skus} / {lastSync.total_erp_products}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-xs uppercase">
                  Duracion
                </Text>
                <Text className="text-sm font-medium">
                  {formatDuration(lastSync.duration_ms)}
                </Text>
              </div>
              <div>
                <Text className="text-ui-fg-subtle text-xs uppercase">
                  Historial
                </Text>
                <Text className="text-sm font-medium">
                  {failedCount > 0 && (
                    <span className="text-ui-fg-error">{failedCount} fallidos</span>
                  )}
                  {failedCount > 0 && errorCount > 0 && ", "}
                  {errorCount > 0 && (
                    <span className="text-orange-600">{errorCount} con errores</span>
                  )}
                  {failedCount === 0 && errorCount === 0 && (
                    <span className="text-green-600">Sin problemas</span>
                  )}
                </Text>
              </div>
            </div>
          ) : (
            <Text className="text-ui-fg-muted text-sm">
              {configured
                ? "No se han realizado sincronizaciones aun."
                : "Configura las variables de entorno NUBEX_DB_* para conectar con el ERP."}
            </Text>
          )}
        </div>
      </Container>

      {/* Low Stock Settings */}
      <LowStockSettings />

      {/* Sync History */}
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <Heading level="h2" className="text-base">
              Historial de sincronizaciones
            </Heading>
            <Text className="text-ui-fg-subtle text-xs">
              Haz clic en una fila para ver los cambios detallados por producto
            </Text>
          </div>
          <Button size="small" variant="secondary" onClick={fetchLogs}>
            Actualizar
          </Button>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">Cargando...</Text>
          </div>
        ) : logs.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Text className="text-ui-fg-subtle">Sin registros.</Text>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-ui-fg-subtle">
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">ERP</th>
                  <th className="px-4 py-3">Coincidentes</th>
                  <th className="px-4 py-3">Precios</th>
                  <th className="px-4 py-3">Inv. creados</th>
                  <th className="px-4 py-3">Inv. actualizados</th>
                  <th className="px-4 py-3">Publicados</th>
                  <th className="px-4 py-3">Despublicados</th>
                  <th className="px-4 py-3">Errores</th>
                  <th className="px-4 py-3">Duracion</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <SyncLogRow key={log.id} log={log} />
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
  label: "Nubex ERP",
  icon: Server,
})

export default NubexPage
