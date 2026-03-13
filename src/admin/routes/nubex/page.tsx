import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { RefreshCw, Server, ChevronDown, ChevronRight } from "lucide-react"
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
  errors: number
  error_details: string | null
  duration_ms: number
  started_at: string
  finished_at: string | null
  created_at: string
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

const COL_COUNT = 10

const SyncLogRow = ({ log }: { log: SyncLog }) => {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = log.error_details || log.errors > 0 || log.status === "failed"

  return (
    <>
      <tr
        className={`border-b hover:bg-ui-bg-subtle-hover ${hasDetails ? "cursor-pointer" : ""}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs">
          {hasDetails && (
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
                  <Text className="text-ui-fg-subtle text-xs uppercase">SKUs sin inventario</Text>
                  <Text className="text-sm">
                    {log.total_erp_products - log.matched_skus} sin coincidencia
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

      {/* Sync History */}
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <Heading level="h2" className="text-base">
              Historial de sincronizaciones
            </Heading>
            <Text className="text-ui-fg-subtle text-xs">
              Haz clic en una fila con errores para ver detalles
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
