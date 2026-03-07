import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function customerCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const customerService = container.resolve(Modules.CUSTOMER) as any
    const customer = await customerService.retrieveCustomer(data.id)

    if (!customer?.email) return

    const notificationService = container.resolve(Modules.NOTIFICATION) as any
    await notificationService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "customer-welcome",
      data: {
        customer_name: [customer.first_name, customer.last_name]
          .filter(Boolean)
          .join(" "),
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send customer welcome email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
