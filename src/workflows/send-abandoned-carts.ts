import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  sendAbandonedNotificationsStep,
  SendAbandonedNotificationsInput,
} from "./steps/send-abandoned-notifications"

type MarkCartsNotifiedInput = {
  cart_ids: string[]
}

export const markCartsNotifiedStep = createStep(
  "mark-carts-notified",
  async (input: MarkCartsNotifiedInput, { container }) => {
    const query = container.resolve("query")

    for (const cartId of input.cart_ids) {
      try {
        // Update cart metadata to mark as notified
        const { data: carts } = await query.graph({
          entity: "cart",
          fields: ["id", "metadata"],
          filters: { id: cartId },
        })

        if (carts.length > 0) {
          const cart = carts[0] as any
          const remoteLink = container.resolve("remoteLink") as any

          // We use the cart module directly to update metadata
          const cartService = container.resolve("cart") as any
          await cartService.updateCarts(cartId, {
            metadata: {
              ...(cart.metadata || {}),
              abandoned_notified_at: new Date().toISOString(),
            },
          })
        }
      } catch (error) {
        console.error(
          `Failed to mark cart ${cartId} as notified:`,
          error
        )
      }
    }

    return new StepResponse(input.cart_ids)
  }
)

export const sendAbandonedCartsWorkflow = createWorkflow(
  "send-abandoned-carts",
  (input: SendAbandonedNotificationsInput) => {
    const sentCartIds = sendAbandonedNotificationsStep(input)

    markCartsNotifiedStep({ cart_ids: sentCartIds })

    return new WorkflowResponse(sentCartIds)
  }
)
