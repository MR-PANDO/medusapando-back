import { MedusaService } from "@medusajs/framework/utils"
import { EmailAudit } from "./models/email-audit"
import { SmtpSettings } from "./models/smtp-settings"
import type { LogEmailInput } from "./types"

class EmailAuditModuleService extends MedusaService({
  EmailAudit,
  SmtpSettings,
}) {
  async logEmail(data: LogEmailInput) {
    return this.createEmailAudits({
      to: data.to,
      from: data.from,
      subject: data.subject,
      email_type: data.email_type,
      status: data.status,
      error: data.error ?? null,
      metadata: data.metadata ?? null,
      sent_at: data.sent_at ?? (data.status === "sent" ? new Date() : null),
    })
  }

  async markSent(id: string) {
    return this.updateEmailAudits({
      id,
      status: "sent",
      sent_at: new Date(),
    })
  }

  async markFailed(id: string, error: string) {
    return this.updateEmailAudits({
      id,
      status: "failed",
      error,
    })
  }

  async listByFilters(filters: {
    status?: string
    email_type?: string
    to?: string
    limit?: number
    offset?: number
  }) {
    const query: Record<string, any> = {}
    if (filters.status) query.status = filters.status
    if (filters.email_type) query.email_type = filters.email_type
    if (filters.to) query.to = filters.to

    return this.listAndCountEmailAudits(query, {
      order: { created_at: "DESC" },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    })
  }

  async getSmtpSettings(): Promise<{
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    from: string
  } | null> {
    const [records] = await this.listAndCountSmtpSettings(
      {},
      { take: 1, order: { created_at: "DESC" } }
    )
    if (records.length === 0) return null
    const r = records[0] as any
    return {
      host: r.host,
      port: r.port,
      secure: r.secure,
      user: r.user,
      pass: r.pass,
      from: r.from,
    }
  }

  async upsertSmtpSettings(data: {
    host: string
    port: number
    secure: boolean
    user: string
    pass: string
    from: string
  }) {
    const [existing] = await this.listAndCountSmtpSettings({}, { take: 1 })
    if (existing.length > 0) {
      return this.updateSmtpSettings({
        id: (existing[0] as any).id,
        ...data,
      })
    }
    return this.createSmtpSettings(data)
  }
}

export default EmailAuditModuleService
