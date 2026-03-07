import { AbstractPaymentProvider } from "@medusajs/framework/utils"
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  WebhookActionResult,
  ProviderWebhookPayload,
} from "@medusajs/types"
import { validateWompiSignature } from "../../utils/wompi-signature"

type WompiProviderOptions = {
  publicKey: string
  privateKey: string
  eventsSecret: string
  environment: "sandbox" | "production"
}

const API_URLS = {
  sandbox: "https://sandbox.wompi.co/v1",
  production: "https://production.wompi.co/v1",
} as const

class WompiPaymentProviderService extends AbstractPaymentProvider<WompiProviderOptions> {
  static identifier = "wompi"

  private publicKey: string
  private privateKey: string
  private eventsSecret: string
  private apiUrl: string

  static validateOptions(options: Record<string, any>) {
    if (!options.publicKey) {
      throw new Error("Wompi publicKey is required")
    }
    if (!options.privateKey) {
      throw new Error("Wompi privateKey is required")
    }
    if (!options.eventsSecret) {
      throw new Error("Wompi eventsSecret is required")
    }
    const env = options.environment ?? "sandbox"
    if (!["sandbox", "production"].includes(env)) {
      throw new Error("Wompi environment must be 'sandbox' or 'production'")
    }
  }

  constructor(container: Record<string, any>, options: WompiProviderOptions) {
    super(container, options)
    this.publicKey = options.publicKey
    this.privateKey = options.privateKey
    this.eventsSecret = options.eventsSecret
    this.apiUrl = API_URLS[options.environment ?? "sandbox"]
  }

  // -- Get transaction status from Wompi --

  async getTransactionStatus(transactionId: string) {
    const response = await fetch(
      `${this.apiUrl}/transactions/${encodeURIComponent(transactionId)}`,
      {
        headers: { Authorization: `Bearer ${this.publicKey}` },
      }
    )

    if (!response.ok) {
      throw new Error(`Wompi transaction lookup failed (${response.status})`)
    }

    const data = await response.json()
    return {
      status: data.data.status as string,
      amountInCents: data.data.amount_in_cents as number,
      reference: data.data.reference as string,
    }
  }

  // -- Signature validation --

  validateWebhookSignature(payload: {
    data: Record<string, any>
    signature: { properties: string[]; checksum: string }
    timestamp: number
  }): boolean {
    return validateWompiSignature(payload, this.eventsSecret)
  }

  // -- AbstractPaymentProvider required methods --

  async initiatePayment(
    input: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    // Payment link is created asynchronously via admin route
    // when admin triggers "generate_wompi" for an order
    return {
      id: `wompi_${Date.now()}`,
      data: {
        order_id: input.context?.customer?.id ?? null,
        amount_in_cents: input.amount,
        currency: input.currency_code?.toUpperCase() ?? "COP",
        status: "pending_link",
      },
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    return {
      status: "authorized" as any,
      data: input.data ?? {},
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    // Wompi void endpoint for card transactions
    const transactionId = (input.data as any)?.wompi_transaction_id
    if (transactionId) {
      try {
        await fetch(
          `${this.apiUrl}/transactions/${encodeURIComponent(transactionId)}/void`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${this.privateKey}` },
          }
        )
      } catch (err) {
        console.error("Wompi void request failed:", err)
      }
    }
    return { data: input.data ?? {} }
  }

  async deletePayment(
    _input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    return {}
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    return {
      data: {
        ...(input.data ?? {}),
        amount: input.amount,
      },
    }
  }

  async getPaymentStatus(
    _input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    return { status: "pending" as any }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const body = (payload as any)?.data ?? payload
    const transaction = body?.transaction

    if (!transaction) {
      return { action: "not_supported" }
    }

    const statusMap: Record<string, string> = {
      APPROVED: "captured",
      DECLINED: "failed",
      VOIDED: "canceled",
      ERROR: "failed",
    }

    const action = statusMap[transaction.status]
    if (!action) {
      return { action: "not_supported" }
    }

    return {
      action: action as any,
      data: {
        session_id: transaction.reference,
        amount: transaction.amount_in_cents,
      },
    }
  }
}

export default WompiPaymentProviderService
