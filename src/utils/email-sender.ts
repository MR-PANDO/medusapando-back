import nodemailer from "nodemailer"
import type EmailAuditModuleService from "../modules/email-audit/service"
import type { EmailType } from "../modules/email-audit/types"

type SendEmailParams = {
  to: string
  subject: string
  html: string
  email_type: EmailType
  metadata?: Record<string, any>
}

async function createTransporter(): Promise<{
  transporter: nodemailer.Transporter
  from: string
}> {
  // Try DB settings first
  try {
    const { Client } = await import("pg")
    const client = new Client({
      connectionString: process.env.DATABASE_URL || "",
    })
    await client.connect()
    const result = await client.query(
      `SELECT host, port, secure, "user", pass, "from"
       FROM smtp_settings
       WHERE deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`
    )
    await client.end()

    if (result.rows.length > 0) {
      const row = result.rows[0]
      return {
        transporter: nodemailer.createTransport({
          host: row.host,
          port: row.port,
          secure: row.secure,
          auth: { user: row.user, pass: row.pass },
        }),
        from: row.from,
      }
    }
  } catch {
    // DB not available — fall back to env vars
  }

  return {
    transporter: nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    }),
    from: process.env.SMTP_FROM ?? "",
  }
}

/**
 * Send an email and log it to the email-audit module.
 * If auditService is not provided, sends without logging.
 */
export async function sendEmail(
  params: SendEmailParams,
  auditService?: EmailAuditModuleService
) {
  const { transporter, from } = await createTransporter()

  // Log as queued (best-effort — don't block send if logging fails)
  let auditId: string | null = null
  if (auditService) {
    try {
      const record = await auditService.logEmail({
        to: params.to,
        from,
        subject: params.subject,
        email_type: params.email_type,
        status: "queued",
        metadata: params.metadata ?? null,
      })
      auditId = record.id
    } catch (err) {
      console.error("[EmailAudit] Failed to log queued email:", err)
    }
  }

  // Send
  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })

    // Mark as sent
    if (auditService && auditId) {
      try {
        await auditService.markSent(auditId)
      } catch (err) {
        console.error("[EmailAudit] Failed to mark email as sent:", err)
      }
    }
  } catch (error: any) {
    // Mark as failed
    if (auditService && auditId) {
      try {
        await auditService.markFailed(auditId, error.message ?? String(error))
      } catch (err) {
        console.error("[EmailAudit] Failed to mark email as failed:", err)
      }
    }
    throw error
  }
}
