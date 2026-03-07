export type EmailStatus = "queued" | "sent" | "failed"

export type EmailType =
  // Custom module emails
  | "abandoned-cart"
  | "payment-link"
  | "payment-status"
  // Medusa system notification templates
  | "order-confirmation"
  | "order-shipped"
  | "order-canceled"
  | "order-refund"
  | "customer-welcome"
  | "password-reset"
  | "invite-user"
  // Catch-all for future templates
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
