import { MedusaService } from "@medusajs/framework/utils"
import { WompiPayment } from "./models/wompi-payment"
import {
  WompiSettings,
  CreatePaymentLinkParams,
  CreatePaymentLinkResult,
} from "./types"

const WOMPI_API_URLS = {
  sandbox: "https://sandbox.wompi.co/v1",
  production: "https://production.wompi.co/v1",
} as const

class WompiModuleService extends MedusaService({
  WompiPayment,
}) {
  private getApiConfig() {
    const privateKey = process.env.WOMPI_PRIVATE_KEY
    const environment = (process.env.WOMPI_ENVIRONMENT ?? "sandbox") as
      | "sandbox"
      | "production"

    if (!privateKey) {
      throw new Error(
        "WOMPI_PRIVATE_KEY is not configured. Add it to your environment variables."
      )
    }

    return {
      privateKey,
      apiUrl: WOMPI_API_URLS[environment],
    }
  }

  async createPaymentLink(
    params: CreatePaymentLinkParams
  ): Promise<CreatePaymentLinkResult> {
    const { privateKey, apiUrl } = this.getApiConfig()
    const storefrontUrl = process.env.STOREFRONT_URL || ""

    const body: Record<string, any> = {
      name: `Order ${params.reference}`,
      description: `Payment for order ${params.reference}`,
      single_use: true,
      collect_shipping: false,
      currency: params.currency || "COP",
      amount_in_cents: params.amountInCents,
      redirect_url:
        params.redirectUrl || `${storefrontUrl}/order/confirmed`,
    }

    if (params.expiresAt) {
      body.expires_at = params.expiresAt
    }

    if (params.customerEmail) {
      body.customer_data = {
        email: params.customerEmail,
        full_name: params.customerName ?? "",
      }
    }

    const response = await fetch(`${apiUrl}/payment_links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(
        `Wompi payment link creation failed (${response.status}): ${errorBody}`
      )
    }

    const data = await response.json()

    return {
      paymentLinkId: data.data.id,
      checkoutUrl: data.data.permalink,
    }
  }

  async getSettings(): Promise<WompiSettings> {
    return {
      paymentManagerEmail: process.env.WOMPI_PAYMENT_MANAGER_EMAIL ?? "",
      emailNotificationsEnabled:
        process.env.WOMPI_EMAIL_NOTIFICATIONS !== "false",
    }
  }

  async getPendingPayments() {
    return this.listWompiPayments({
      wompi_status: ["link_generating", "link_ready", "pending"],
    })
  }

  async getAllPayments(filters?: { status?: string[] }) {
    const query: Record<string, any> = {}
    if (filters?.status?.length) {
      query.wompi_status = filters.status
    }
    return this.listWompiPayments(query)
  }

  async findByPaymentLinkId(paymentLinkId: string) {
    const records = await this.listWompiPayments({
      wompi_payment_link_id: paymentLinkId,
    })
    return records.length ? records[0] : null
  }

  async findByOrderId(orderId: string) {
    const records = await this.listWompiPayments({
      order_id: orderId,
    })
    return records.length ? records[0] : null
  }

  async createPaymentRecord(data: {
    orderId: string
    reference: string
    amountInCents: number
    paymentLinkId: string
    checkoutUrl: string
    customerEmail?: string
  }) {
    return this.createWompiPayments({
      order_id: data.orderId,
      reference: data.reference,
      wompi_payment_link_id: data.paymentLinkId,
      wompi_checkout_url: data.checkoutUrl,
      amount_in_cents: data.amountInCents,
      customer_email: data.customerEmail ?? null,
      wompi_status: "link_ready",
      link_generated_at: new Date(),
    })
  }

  async updateFromWebhook(
    paymentLinkId: string,
    transactionId: string,
    wompiStatus: string,
    paymentMethodType: string | null,
    payload: Record<string, any>
  ) {
    const record = await this.findByPaymentLinkId(paymentLinkId)
    if (!record) return null

    const statusMap: Record<string, string> = {
      PENDING: "pending",
      APPROVED: "approved",
      DECLINED: "declined",
      VOIDED: "voided",
      ERROR: "error",
    }

    const isFinal = ["APPROVED", "DECLINED", "VOIDED", "ERROR"].includes(
      wompiStatus
    )

    return this.updateWompiPayments({
      id: record.id,
      wompi_transaction_id: transactionId,
      wompi_status: statusMap[wompiStatus] ?? "error",
      payment_method_type: paymentMethodType,
      finalized_at: isFinal ? new Date() : undefined,
      last_webhook_payload: payload,
    })
  }
}

export default WompiModuleService
