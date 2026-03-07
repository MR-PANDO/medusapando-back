import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  try {
    const query = req.scope.resolve("query")
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS)

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "updated_at",
        "metadata",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
      ],
      filters: {
        completed_at: null,
        customer_id: customerId,
      },
    })

    // Find the most recent abandoned cart (within 7 days, has items)
    const abandonedCart = (carts as any[])
      .filter((cart) => {
        if (!cart.items || cart.items.length === 0) return false
        if (new Date(cart.updated_at) < sevenDaysAgo) return false
        return true
      })
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )[0]

    if (!abandonedCart) {
      return res.json({ abandoned_cart: null })
    }

    const firstNotifiedAt = abandonedCart.metadata?.abandoned_first_notified_at
    const expiresAt = firstNotifiedAt
      ? new Date(new Date(firstNotifiedAt).getTime() + SEVEN_DAYS_MS)
      : new Date(new Date(abandonedCart.updated_at).getTime() + SEVEN_DAYS_MS)

    res.json({
      abandoned_cart: {
        id: abandonedCart.id,
        updated_at: abandonedCart.updated_at,
        expires_at: expiresAt.toISOString(),
        items: abandonedCart.items.map((item: any) => ({
          id: item.id,
          title: item.variant?.product?.title || item.title,
          quantity: item.quantity,
          thumbnail: item.variant?.product?.thumbnail || item.thumbnail,
          variant_title: item.variant?.title,
          unit_price: item.unit_price,
        })),
      },
    })
  } catch (error: any) {
    console.error("Error fetching abandoned cart:", error)
    res.status(500).json({ message: "Failed to fetch abandoned cart" })
  }
}
