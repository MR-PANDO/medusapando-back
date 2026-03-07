export const WOMPI_STATUSES = {
  LINK_GENERATING: "link_generating",
  LINK_READY: "link_ready",
  PENDING: "pending",
  APPROVED: "approved",
  DECLINED: "declined",
  VOIDED: "voided",
  ERROR: "error",
} as const

export type WompiStatus = (typeof WOMPI_STATUSES)[keyof typeof WOMPI_STATUSES]

export const WOMPI_ORDER_STATUSES = {
  GENERATE_WOMPI: "generate_wompi",
  LINK_GENERATING: "link_generating",
  LINK_READY: "wompi_link_ready",
  LINK_ERROR: "wompi_link_error",
  PENDING: "wompi_pending",
  PAYMENT_APPROVED: "payment_approved",
  PAYMENT_DECLINED: "payment_declined",
  PAYMENT_VOIDED: "payment_voided",
  PAYMENT_ERROR: "payment_error",
} as const

export type WompiOrderStatus =
  (typeof WOMPI_ORDER_STATUSES)[keyof typeof WOMPI_ORDER_STATUSES]

export type WompiSettings = {
  paymentManagerEmail: string
  emailNotificationsEnabled: boolean
}

export type WompiWebhookPayload = {
  event: string
  data: {
    transaction: {
      id: string
      amount_in_cents: number
      reference: string
      customer_email: string
      currency: string
      payment_method_type: string
      redirect_url: string
      status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR"
      payment_link_id: string
      payment_source_id: string | null
    }
  }
  signature: {
    properties: string[]
    checksum: string
  }
  timestamp: number
  sent_at: string
}

export type CreatePaymentLinkParams = {
  orderId: string
  reference: string
  amountInCents: number
  currency?: string
  customerEmail?: string
  customerName?: string
  customerPhone?: string
  expiresAt?: string
  redirectUrl?: string
}

export type CreatePaymentLinkResult = {
  paymentLinkId: string
  checkoutUrl: string
}
