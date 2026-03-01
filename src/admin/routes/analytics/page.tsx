import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import {
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react"

type TopProduct = {
  id: string
  title: string
  thumbnail: string | null
  handle: string
  total_quantity: number
}

type RecentOrder = {
  id: string
  display_id: number
  email: string
  total: number
  currency_code: string
  status: string
  created_at: string
  items: Array<{
    title: string
    quantity: number
    unit_price: number
  }>
}

type TopPage = {
  page_path: string
  views: number
}

type RecentSession = {
  session_id: string
  pages: number
  first_page: string
  referrer: string | null
  country_code: string | null
  last_seen: string
}

type DashboardData = {
  visitors: {
    daily: number
    weekly: number
    monthly: number
  }
  topPages: TopPage[]
  recentSessions: RecentSession[]
  topSellingProducts: TopProduct[]
  recentOrders: RecentOrder[]
  summary: {
    totalRevenue: number
    collectedRevenue: number
    pendingRevenue: number
    totalOrders: number
    pendingOrdersCount: number
    fulfilledOrdersCount: number
    canceledOrdersCount: number
    currency: string
  }
}

const formatCurrency = (amount: number, currency: string) => {
  // For COP, amounts are stored as whole numbers (not cents)
  // Use manual formatting to ensure dot as thousand separator
  const formattedAmount = Math.round(amount).toLocaleString("de-DE") // German locale uses dots for thousands
  return `$${formattedAmount} COP`
}

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString))
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "green"
    case "pending":
      return "orange"
    case "canceled":
      return "red"
    default:
      return "grey"
  }
}

// Simple bar chart component
const SimpleBarChart = ({ data, maxValue }: { data: TopProduct[], maxValue: number }) => {
  const colors = [
    "bg-emerald-500",
    "bg-emerald-400",
    "bg-teal-500",
    "bg-teal-400",
    "bg-cyan-500",
    "bg-cyan-400",
    "bg-sky-500",
    "bg-sky-400",
    "bg-blue-500",
    "bg-blue-400",
  ]

  return (
    <div className="space-y-3">
      {data.map((product, index) => {
        const percentage = maxValue > 0 ? (product.total_quantity / maxValue) * 100 : 0
        return (
          <div key={product.id} className="flex items-center gap-3">
            <div className="w-6 text-sm text-gray-500 font-medium">
              {index + 1}.
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]">
                  {product.title}
                </span>
                <span className="text-sm font-bold text-gray-900">
                  {product.total_quantity} uds
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${colors[index] || "bg-gray-400"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const AnalyticsPage = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/admin/analytics/dashboard", {
        credentials: "include",
      })
      if (res.ok) {
        const dashboardData = await res.json()
        setData(dashboardData)
      } else {
        const errorData = await res.json()
        setError(errorData.error || "Error al cargar analytics")
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboard, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <BarChart3 className="text-ui-fg-subtle" />
            <div>
              <Heading level="h1">Analytics</Heading>
              <Text className="text-ui-fg-subtle">
                Resumen de ventas y visitantes
              </Text>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          <span className="ml-3 text-gray-500">Cargando analytics...</span>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-x-3">
            <BarChart3 className="text-ui-fg-subtle" />
            <div>
              <Heading level="h1">Analytics</Heading>
              <Text className="text-ui-fg-subtle">
                Resumen de ventas y visitantes
              </Text>
            </div>
          </div>
        </div>
        <div className="text-center py-8 px-6">
          <Text className="text-red-500">{error}</Text>
          <button
            onClick={fetchDashboard}
            className="mt-4 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
          >
            Reintentar
          </button>
        </div>
      </Container>
    )
  }

  if (!data) return null

  const maxQuantity = data.topSellingProducts.length > 0
    ? Math.max(...data.topSellingProducts.map(p => p.total_quantity))
    : 0

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-x-3">
          <BarChart3 className="text-ui-fg-subtle" />
          <div>
            <Heading level="h1">Analytics</Heading>
            <Text className="text-ui-fg-subtle">
              Resumen de ventas y visitantes
            </Text>
          </div>
        </div>
        <button
          onClick={fetchDashboard}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar datos"
        >
          <TrendingUp className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      <div className="px-6 py-6">
        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Collected Revenue - Fulfilled orders */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Ingresos Recaudados</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {formatCurrency(data.summary.collectedRevenue, data.summary.currency)}
            </div>
            <div className="text-xs text-emerald-600 mt-1">
              {data.summary.fulfilledOrdersCount} pedidos completados
            </div>
          </div>

          {/* Pending Revenue */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Por Recaudar</span>
            </div>
            <div className="text-2xl font-bold text-amber-800">
              {formatCurrency(data.summary.pendingRevenue, data.summary.currency)}
            </div>
            <div className="text-xs text-amber-600 mt-1">
              {data.summary.pendingOrdersCount} pedidos pendientes
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Ingresos Totales</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {formatCurrency(data.summary.totalRevenue, data.summary.currency)}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Recaudados + Pendientes
            </div>
          </div>
        </div>

        {/* Orders Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {/* Total Orders */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">Total Pedidos</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {data.summary.totalOrders}
            </div>
          </div>

          {/* Pending Orders */}
          <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Pendientes</span>
            </div>
            <div className="text-2xl font-bold text-amber-800">
              {data.summary.pendingOrdersCount}
            </div>
          </div>

          {/* Fulfilled Orders */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">Completados</span>
            </div>
            <div className="text-2xl font-bold text-emerald-800">
              {data.summary.fulfilledOrdersCount}
            </div>
          </div>

          {/* Canceled Orders */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700 font-medium">Cancelados</span>
            </div>
            <div className="text-2xl font-bold text-red-800">
              {data.summary.canceledOrdersCount}
            </div>
          </div>
        </div>

        {/* Visitor Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="font-semibold text-gray-700">Detalle de Visitantes</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600">{data.visitors.daily}</div>
              <div className="text-sm text-gray-500">Hoy</div>
            </div>
            <div className="text-center border-x border-gray-200">
              <div className="text-3xl font-bold text-blue-600">{data.visitors.weekly}</div>
              <div className="text-sm text-gray-500">Últimos 7 días</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{data.visitors.monthly}</div>
              <div className="text-sm text-gray-500">Últimos 30 días</div>
            </div>
          </div>
        </div>

        {/* Top Pages & Recent Sessions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Pages */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-gray-700">Páginas Más Visitadas (30 días)</span>
            </div>
            {data.topPages && data.topPages.length > 0 ? (
              <div className="space-y-2">
                {data.topPages.map((page, index) => (
                  <div key={page.page_path} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-xs text-gray-400 w-5">{index + 1}.</span>
                      <span className="text-sm text-gray-700 truncate">{page.page_path}</span>
                    </div>
                    <span className="text-sm font-bold text-indigo-600 ml-2">{page.views}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Sin datos de páginas aún. Los datos aparecerán cuando los visitantes naveguen el sitio.
              </div>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-gray-700">Últimas Sesiones</span>
            </div>
            {data.recentSessions && data.recentSessions.length > 0 ? (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {data.recentSessions.map((session) => (
                  <div key={session.session_id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate max-w-[180px]">
                        {session.first_page}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(session.last_seen)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{session.pages} página{session.pages !== 1 ? "s" : ""}</span>
                      {session.country_code && (
                        <span className="uppercase font-medium">{session.country_code}</span>
                      )}
                      {session.referrer && (
                        <span className="truncate max-w-[150px]" title={session.referrer}>
                          via {new URL(session.referrer).hostname}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-sm">
                Sin sesiones registradas aún. Los datos aparecerán cuando los visitantes naveguen el sitio.
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 10 Products */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-emerald-600" />
              <span className="font-semibold text-gray-700">Top 10 Productos Más Vendidos</span>
            </div>

            {data.topSellingProducts.length > 0 ? (
              <SimpleBarChart data={data.topSellingProducts} maxValue={maxQuantity} />
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay datos de ventas aún
              </div>
            )}
          </div>

          {/* Recent Orders */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-700">Últimas 10 Ventas</span>
            </div>

            {data.recentOrders.length > 0 ? (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {data.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          #{order.display_id}
                        </span>
                        <Badge color={getStatusColor(order.status)} size="xsmall">
                          {order.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-[180px]">
                        {order.email}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(order.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">
                        {formatCurrency(order.total, order.currency_code)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.items?.length || 0} productos
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No hay pedidos aún
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Analytics",
  icon: BarChart3,
})

export default AnalyticsPage
