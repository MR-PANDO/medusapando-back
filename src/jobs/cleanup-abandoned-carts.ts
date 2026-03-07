import { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const CLEANUP_AFTER_DAYS = 30

export default async function cleanupAbandonedCartsJob(
  container: MedusaContainer
) {
  const query = container.resolve("query")
  const cartService = container.resolve(Modules.CART) as any
  const link = container.resolve("link") as any

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - CLEANUP_AFTER_DAYS)

  try {
    // Find incomplete carts older than the cutoff
    const { data: carts } = await query.graph({
      entity: "cart",
      fields: ["id", "updated_at", "completed_at"],
      filters: {
        completed_at: null,
      },
    })

    // Filter to carts not updated in CLEANUP_AFTER_DAYS
    const staleCarts = (carts as any[]).filter(
      (cart) => new Date(cart.updated_at) < cutoffDate
    )

    if (staleCarts.length === 0) {
      console.log("[Cart Cleanup] No stale carts to clean up.")
      return
    }

    const staleCartIds = staleCarts.map((c) => c.id)

    console.log(
      `[Cart Cleanup] Found ${staleCartIds.length} stale cart(s) older than ${CLEANUP_AFTER_DAYS} days. Cleaning up...`
    )

    // Dismiss cross-module link records (payment collections, promotions)
    // These don't cascade on soft-delete, so we clean them up first
    for (const cartId of staleCartIds) {
      try {
        await link.dismiss({
          [Modules.CART]: { cart_id: cartId },
        })
      } catch {
        // Link records may not exist for all carts — safe to ignore
      }
    }

    // Soft-delete the carts (sets deleted_at, cascades to items/shipping/addresses)
    await cartService.softDeleteCarts(staleCartIds)

    console.log(
      `[Cart Cleanup] Soft-deleted ${staleCartIds.length} stale cart(s).`
    )
  } catch (error) {
    console.error("[Cart Cleanup] Error:", error)
  }
}

export const config = {
  name: "cleanup-abandoned-carts",
  schedule: "0 2 * * *", // Every day at 2am
}
