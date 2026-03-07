import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function inviteCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    const userService = container.resolve(Modules.USER) as any
    const invite = await userService.retrieveInvite(data.id)

    if (!invite?.email) return

    const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
    const inviteLink = `${backendUrl}/app/invite?token=${invite.token}`

    const notificationService = container.resolve(Modules.NOTIFICATION) as any
    await notificationService.createNotifications({
      to: invite.email,
      channel: "email",
      template: "invite-user",
      data: {
        invite_link: inviteLink,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send invite email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "invite.created",
}
