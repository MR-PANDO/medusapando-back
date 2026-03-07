import { MedusaService } from "@medusajs/framework/utils"
import { WompiPayment } from "./models/wompi-payment"
import { WompiSettings } from "./types"

class WompiModuleService extends MedusaService({
  WompiPayment,
}) {
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
