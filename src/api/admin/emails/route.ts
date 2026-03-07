import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EMAIL_AUDIT_MODULE } from "../../../modules/email-audit"
import type EmailAuditModuleService from "../../../modules/email-audit/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const emailAuditService =
    req.scope.resolve<EmailAuditModuleService>(EMAIL_AUDIT_MODULE)

  const {
    status,
    email_type,
    to,
    limit,
    offset,
  } = req.query as Record<string, string | undefined>

  const [emails, count] = await emailAuditService.listByFilters({
    status: status || undefined,
    email_type: email_type || undefined,
    to: to || undefined,
    limit: limit ? Number(limit) : 50,
    offset: offset ? Number(offset) : 0,
  })

  res.json({ emails, count })
}
