import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_AUDIT_MODULE } from "../../../../modules/email-audit"
import type EmailAuditModuleService from "../../../../modules/email-audit/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
  const settings = await service.getSmtpSettings()
  // Never expose the password in full — mask it
  if (settings && settings.pass) {
    settings.pass = settings.pass.length > 4
      ? settings.pass.slice(0, 2) + "*".repeat(settings.pass.length - 4) + settings.pass.slice(-2)
      : "****"
  }
  res.json({ settings })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(EMAIL_AUDIT_MODULE) as EmailAuditModuleService
  const { host, port, secure, user, pass, from, manager_email } = req.body as any

  if (!host || !user || !pass || !from) {
    res.status(400).json({ error: "host, user, pass, and from are required" })
    return
  }

  await service.upsertSmtpSettings({
    host,
    port: Number(port) || 465,
    secure: secure !== false,
    user,
    pass,
    from,
    manager_email: manager_email || null,
  })

  res.json({ success: true })
}
