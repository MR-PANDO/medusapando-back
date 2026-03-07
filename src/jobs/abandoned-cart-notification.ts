import { MedusaContainer } from "@medusajs/framework/types"
import { sendAbandonedCartsWorkflow } from "../workflows/send-abandoned-carts"

// Drip schedule: email 1 at 24h, email 2 at 72h (3 days), email 3 at 144h (6 days)
const DRIP_SCHEDULE = [
  { count: 0, hoursAfterUpdate: 24 },     // Email 1: 24h after last cart update
  { count: 1, hoursAfterFirst: 72 },       // Email 2: 72h after first email
  { count: 2, hoursAfterFirst: 144 },      // Email 3: 144h (6 days) after first email
]

const MAX_AGE_HOURS = 168 // 7 days — stop all emails after this

export default async function abandonedCartNotificationJob(
  container: MedusaContainer
) {
  const query = container.resolve("query")
  const now = new Date()

  try {
    // Fetch incomplete carts with items
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id",
        "email",
        "metadata",
        "updated_at",
        "completed_at",
        "items.*",
        "items.variant.*",
        "items.variant.product.*",
      ],
      filters: {
        completed_at: null,
      },
    })

    const cartsToNotify: Array<{
      id: string
      email: string
      items: any[]
      customer_name?: string
      reminder_number: number
    }> = []

    for (const cart of carts as any[]) {
      if (!cart.email) continue
      if (!cart.items || cart.items.length === 0) continue

      const notifyCount = cart.metadata?.abandoned_notify_count || 0
      const firstNotifiedAt = cart.metadata?.abandoned_first_notified_at
        ? new Date(cart.metadata.abandoned_first_notified_at)
        : null

      // Already sent all 3 emails — done
      if (notifyCount >= 3) continue

      // If first email was sent >7 days ago — expired, stop
      if (firstNotifiedAt) {
        const hoursSinceFirst = (now.getTime() - firstNotifiedAt.getTime()) / (1000 * 60 * 60)
        if (hoursSinceFirst > MAX_AGE_HOURS) continue
      }

      const schedule = DRIP_SCHEDULE[notifyCount]
      if (!schedule) continue

      let shouldSend = false

      if (notifyCount === 0) {
        // Email 1: cart must be updated >24h ago
        const hoursSinceUpdate = (now.getTime() - new Date(cart.updated_at).getTime()) / (1000 * 60 * 60)
        shouldSend = hoursSinceUpdate >= schedule.hoursAfterUpdate!
      } else if (firstNotifiedAt && "hoursAfterFirst" in schedule) {
        // Email 2 & 3: based on time since first notification
        const hoursSinceFirst = (now.getTime() - firstNotifiedAt.getTime()) / (1000 * 60 * 60)
        shouldSend = hoursSinceFirst >= schedule.hoursAfterFirst!
      }

      if (shouldSend) {
        cartsToNotify.push({
          id: cart.id,
          email: cart.email,
          reminder_number: notifyCount + 1,
          items: cart.items.map((item: any) => ({
            title: item.variant?.product?.title || item.title,
            quantity: item.quantity,
            thumbnail: item.variant?.product?.thumbnail || item.thumbnail,
            variant_title: item.variant?.title,
            unit_price: item.unit_price,
          })),
          customer_name: cart.shipping_address?.first_name || undefined,
        })
      }
    }

    if (cartsToNotify.length === 0) {
      console.log("[Abandoned Cart Job] No abandoned carts to notify.")
      return
    }

    console.log(
      `[Abandoned Cart Job] Found ${cartsToNotify.length} abandoned cart(s). Sending notifications...`
    )

    await sendAbandonedCartsWorkflow(container).run({
      input: { carts: cartsToNotify },
    })

    console.log(
      `[Abandoned Cart Job] Successfully processed ${cartsToNotify.length} abandoned cart(s).`
    )
  } catch (error) {
    console.error("[Abandoned Cart Job] Error:", error)
  }
}

export const config = {
  name: "abandoned-cart-notification",
  schedule: "0 0 * * *", // Every day at midnight
}
