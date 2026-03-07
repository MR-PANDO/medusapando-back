import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  sendAbandonedNotificationsStep,
  SendAbandonedNotificationsInput,
} from "./steps/send-abandoned-notifications"

type MarkCartsNotifiedInput = {
  carts: Array<{ id: string; reminder_number: number }>
}

export const markCartsNotifiedStep = createStep(
  "mark-carts-notified",
  async (input: MarkCartsNotifiedInput, { container }) => {
    const query = container.resolve("query")

    for (const { id: cartId, reminder_number } of input.carts) {
      try {
        const { data: carts } = await query.graph({
          entity: "cart",
          fields: ["id", "metadata"],
          filters: { id: cartId },
        })

        if (carts.length > 0) {
          const cart = carts[0] as any
          const cartService = container.resolve("cart") as any

          const now = new Date().toISOString()
          const metadata = {
            ...(cart.metadata || {}),
            abandoned_notify_count: reminder_number,
          }

          // Set the first notified timestamp only on the first email
          if (reminder_number === 1) {
            metadata.abandoned_first_notified_at = now
          }

          await cartService.updateCarts(cartId, { metadata })
        }
      } catch (error) {
        console.error(
          `Failed to mark cart ${cartId} as notified (email #${reminder_number}):`,
          error
        )
      }
    }

    return new StepResponse(input.carts.map((c) => c.id))
  }
)

export const sendAbandonedCartsWorkflow = createWorkflow(
  "send-abandoned-carts",
  (input: SendAbandonedNotificationsInput) => {
    const sentCartIds = sendAbandonedNotificationsStep(input)

    // Use transform to resolve the proxy before calling .map()
    const markInput = transform({ input }, ({ input }) => ({
      carts: input.carts.map((c) => ({
        id: c.id,
        reminder_number: c.reminder_number,
      })),
    }))

    markCartsNotifiedStep(markInput)

    return new WorkflowResponse(sentCartIds)
  }
)
