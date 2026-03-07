import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"

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

    await notifyWithAudit(container, {
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
