import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { Modules } from "@medusajs/framework/utils"
import { INotificationModuleService } from "@medusajs/framework/types"

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
  }>
}

export const sendAbandonedNotificationsStep = createStep(
  "send-abandoned-notifications",
  async (input: SendAbandonedNotificationsInput, { container }) => {
    const notificationService: INotificationModuleService = container.resolve(
      Modules.NOTIFICATION
    )

    const sentCartIds: string[] = []

    for (const cart of input.carts) {
      try {
        await notificationService.createNotifications({
          to: cart.email,
          channel: "email",
          template: "abandoned-cart",
          data: {
            cart_id: cart.id,
            items: cart.items,
            customer_name: cart.customer_name,
          },
        })
        sentCartIds.push(cart.id)
      } catch (error) {
        console.error(
          `Failed to send abandoned cart email for cart ${cart.id}:`,
          error
        )
      }
    }

    return new StepResponse(sentCartIds, sentCartIds)
  }
)
