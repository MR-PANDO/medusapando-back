import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { notifyWithAudit } from "../utils/notify-with-audit"

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
    const resetUrl = `${storefrontUrl}/co/reset-password?token=${data.token}&email=${encodeURIComponent(data.entity_id)}`

    await notifyWithAudit(container, {
      to: data.entity_id,
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
