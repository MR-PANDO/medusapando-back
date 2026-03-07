import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { notifyWithAudit } from "../../utils/notify-with-audit"

type AbandonedCartItem = {
  title?: string
  quantity?: number
  thumbnail?: string
  variant_title?: string
  unit_price?: number
}

export type SendAbandonedNotificationsInput = {
  carts: Array<{
    id: string
    email: string
    items: AbandonedCartItem[]
    customer_name?: string
    reminder_number: number
  }>
}

export const sendAbandonedNotificationsStep = createStep(
  "send-abandoned-notifications",
  async (input: SendAbandonedNotificationsInput, { container }) => {
    const sentCartIds: string[] = []

    for (const cart of input.carts) {
      try {
        await notifyWithAudit(container, {
          to: cart.email,
          channel: "email",
          template: "abandoned-cart",
          data: {
            cart_id: cart.id,
            items: cart.items,
            customer_name: cart.customer_name,
            reminder_number: cart.reminder_number,
          },
        })
        sentCartIds.push(cart.id)
      } catch (error) {
        console.error(
          `Failed to send abandoned cart email #${cart.reminder_number} for cart ${cart.id}:`,
          error
        )
      }
    }

    return new StepResponse(sentCartIds, sentCartIds)
  }
)
