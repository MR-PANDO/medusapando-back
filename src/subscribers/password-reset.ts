import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  entity_id: string
  token: string
  actor_type: string
}>) {
  // Only handle customer password resets (not admin users)
  if (data.actor_type !== "customer") return

  try {
    const storefrontUrl =
      process.env.STOREFRONT_URL || "https://nutrimercados.com"
    const resetUrl = `${storefrontUrl}/co/account/reset-password?token=${data.token}&email=${data.entity_id}`

    const notificationService = container.resolve(Modules.NOTIFICATION) as any
    await notificationService.createNotifications({
      to: data.entity_id, // entity_id is the email for auth identity
      channel: "email",
      template: "password-reset",
      data: {
        url: resetUrl,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send password reset email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
