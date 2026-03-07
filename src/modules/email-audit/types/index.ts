export type EmailStatus = "queued" | "sent" | "failed"

export type EmailType =
  | "abandoned-cart"
  | "payment-link"
  | "payment-status"
  | string

export type LogEmailInput = {
  to: string
  from: string
  subject: string
  email_type: EmailType
  status: EmailStatus
  error?: string | null
  metadata?: Record<string, any> | null
  sent_at?: Date | null
}
