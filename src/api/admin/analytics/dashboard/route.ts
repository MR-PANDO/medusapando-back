import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { ANALYTICS_MODULE } from "../../../../modules/analytics"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    // Try to get analytics service, but don't fail if not available
    let analyticsService: any = null
    try {
      analyticsService = req.scope.resolve(ANALYTICS_MODULE)
    } catch (e) {
      console.log("Analytics module not available yet - run migrations first")
    }

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(todayStart)
    monthStart.setDate(monthStart.getDate() - 30)

    // Get visitor counts - will return 0 if analytics module not available
    const [dailyViews, weeklyViews, monthlyViews] = await Promise.all([
      getUniqueVisitors(analyticsService, todayStart),
      getUniqueVisitors(analyticsService, weekStart),
      getUniqueVisitors(analyticsService, monthStart),
    ])

    // Get top 10 best-selling products from orders
    const { data: ordersWithItems } = await query.graph({
      entity: "order",
      fields: [
        "status",
        "items.quantity",
        "items.variant.product.id",
        "items.variant.product.title",
        "items.variant.product.thumbnail",
        "items.variant.product.handle",
      ],
      filters: {
        status: { $nin: ["canceled", "archived"] }
      },
    }) as { data: any[] }

    // Aggregate product sales
    const productSales: Record<string, {
      id: string
      title: string
      thumbnail: string | null
      handle: string
      total_quantity: number
    }> = {}

    for (const order of ordersWithItems) {
      for (const item of order.items || []) {
        const product = item.variant?.product
        if (!product?.id) continue

        if (!productSales[product.id]) {
          productSales[product.id] = {
            id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
            handle: product.handle,
            total_quantity: 0,
          }
        }
        productSales[product.id].total_quantity += item.quantity || 0
      }
    }

    const topSellingProducts = Object.values(productSales)
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 10)

    // Get last 10 orders with summary for correct totals (required in Medusa 2.x)
    // The summary object contains the accurate order totals
    const { data: recentOrders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "currency_code",
        "status",
        "created_at",
        "items.id",
        "items.title",
        "items.quantity",
        "summary.*",
      ],
      filters: {
        status: { $nin: ["canceled", "archived"] }
      },
      pagination: {
        take: 10,
        order: { created_at: "DESC" }
      }
    })

    // Use summary.current_order_total for the correct total
    const ordersWithCorrectTotal = recentOrders.map((order: any) => {
      const orderTotal = order.summary?.current_order_total || order.summary?.original_order_total || 0
      return {
        ...order,
        total: orderTotal,
      }
    })

    // Log to debug order values
    if (ordersWithCorrectTotal.length > 0) {
      console.log("Order debug:", JSON.stringify(ordersWithCorrectTotal[0], null, 2))
    }

    // Get all orders with fulfillment status and summary for correct totals
    const { data: allOrders } = await query.graph({
      entity: "order",
      fields: [
        "currency_code",
        "status",
        "fulfillment_status",
        "summary.*",
      ],
      filters: {
        status: { $nin: ["archived"] }
      }
    })

    // Use summary for correct totals
    const allOrdersWithTotal = allOrders.map((order: any) => {
      const orderTotal = order.summary?.current_order_total || order.summary?.original_order_total || 0
      return {
        ...order,
        calculatedTotal: orderTotal,
      }
    })

    // Calculate metrics by status using calculated totals
    // Fulfilled orders = revenue collected (ingresos recaudados)
    const fulfilledOrders = allOrdersWithTotal.filter((o: any) =>
      o.status !== "canceled" && o.fulfillment_status === "fulfilled"
    )
    const collectedRevenue = fulfilledOrders.reduce((sum: number, order: any) => sum + (order.calculatedTotal || 0), 0)

    // Pending orders = revenue pending (por recaudar)
    const pendingOrders = allOrdersWithTotal.filter((o: any) =>
      o.status !== "canceled" && o.fulfillment_status !== "fulfilled"
    )
    const pendingRevenue = pendingOrders.reduce((sum: number, order: any) => sum + (order.calculatedTotal || 0), 0)

    // Canceled orders
    const canceledOrders = allOrdersWithTotal.filter((o: any) => o.status === "canceled")

    // Total orders (excluding canceled)
    const activeOrders = allOrdersWithTotal.filter((o: any) => o.status !== "canceled")
    const totalRevenue = activeOrders.reduce((sum: number, order: any) => sum + (order.calculatedTotal || 0), 0)

    return res.json({
      visitors: {
        daily: dailyViews,
        weekly: weeklyViews,
        monthly: monthlyViews,
      },
      topSellingProducts,
      recentOrders: ordersWithCorrectTotal,
      summary: {
        totalRevenue, // Total de todos los pedidos activos
        collectedRevenue, // Ingresos recaudados (fulfilled)
        pendingRevenue, // Por recaudar (pending fulfillment)
        totalOrders: activeOrders.length, // Total pedidos activos
        pendingOrdersCount: pendingOrders.length, // Pedidos pendientes
        fulfilledOrdersCount: fulfilledOrders.length, // Pedidos completados
        canceledOrdersCount: canceledOrders.length, // Pedidos cancelados
        currency: "cop",
      }
    })
  } catch (error: any) {
    console.error("Error fetching analytics:", error)
    return res.status(500).json({ error: error.message })
  }
}

async function getUniqueVisitors(analyticsService: any, since: Date): Promise<number> {
  if (!analyticsService) return 0

  try {
    const views = await analyticsService.listPageViews({
      filters: {
        viewed_at: { $gte: since }
      }
    })
    // Count unique sessions
    const uniqueSessions = new Set(views.map((v: any) => v.session_id))
    return uniqueSessions.size
  } catch (error) {
    // If table doesn't exist yet, return 0
    return 0
  }
}
