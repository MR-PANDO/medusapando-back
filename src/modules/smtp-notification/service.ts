import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import nodemailer, { type Transporter } from "nodemailer"
import {
  abandonedCartTemplate,
  getAbandonedCartSubject,
} from "./templates/abandoned-cart"
import {
  customerWelcomeTemplate,
  customerWelcomeSubject,
} from "./templates/customer-welcome"
import {
  passwordResetTemplate,
  passwordResetSubject,
} from "./templates/password-reset"
import {
  orderPlacedTemplate,
  orderPlacedSubject,
} from "./templates/order-placed"
import {
  orderCanceledTemplate,
  orderCanceledSubject,
} from "./templates/order-canceled"
import {
  orderShippedTemplate,
  orderShippedSubject,
} from "./templates/order-shipped"
import {
  inviteUserTemplate,
  inviteUserSubject,
} from "./templates/invite-user"
import {
  paymentCustomerTemplate,
  paymentCustomerSubject,
} from "./templates/payment-customer"
import {
  orderFulfillmentTemplate,
  orderFulfillmentSubject,
} from "./templates/order-fulfillment"

type SmtpOptions = {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
  from: string
  storefront_url: string
}

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

type SendNotificationInput = {
  to: string
  channel: string
  template: string
  data: Record<string, unknown>
}

type ProviderSendNotificationResultsDTO = {
  id: string
}

// Cache DB settings for 60 seconds to avoid hitting DB on every email
let cachedDbSettings: SmtpConfig | null | undefined = undefined
let cacheTimestamp = 0
const CACHE_TTL = 60_000

async function getDbSmtpSettings(): Promise<SmtpConfig | null> {
  const now = Date.now()
  if (cachedDbSettings !== undefined && now - cacheTimestamp < CACHE_TTL) {
    return cachedDbSettings
  }

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
      cachedDbSettings = {
        host: row.host,
        port: row.port,
        secure: row.secure,
        user: row.user,
        pass: row.pass,
        from: row.from,
      }
    } else {
      cachedDbSettings = null
    }
    cacheTimestamp = now
    return cachedDbSettings
  } catch {
    // DB not available — fall back to env vars
    return null
  }
}

class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp"

  private defaultTransporter: Transporter
  private defaultFrom: string
  private storefrontUrl: string

  constructor(container: Record<string, unknown>, options: SmtpOptions) {
    super()

    this.defaultFrom = options.from
    this.storefrontUrl = options.storefront_url

    this.defaultTransporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: {
        user: options.auth.user,
        pass: options.auth.pass,
      },
    })
  }

  private async getTransporter(): Promise<{ transporter: Transporter; from: string }> {
    const dbSettings = await getDbSmtpSettings()
    if (dbSettings) {
      const transporter = nodemailer.createTransport({
        host: dbSettings.host,
        port: dbSettings.port,
        secure: dbSettings.secure,
        auth: {
          user: dbSettings.user,
          pass: dbSettings.pass,
        },
      })
      return { transporter, from: dbSettings.from }
    }
    return { transporter: this.defaultTransporter, from: this.defaultFrom }
  }

  async send(
    notification: SendNotificationInput
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, template, data } = notification

    let subject: string
    let html: string

    const templateData = { ...data, storefront_url: this.storefrontUrl }

    switch (template) {
      case "abandoned-cart":
        subject = getAbandonedCartSubject(
          (data.reminder_number as number) || 1
        )
        html = abandonedCartTemplate(templateData)
        break
      case "customer-welcome":
        subject = customerWelcomeSubject()
        html = customerWelcomeTemplate(templateData)
        break
      case "password-reset":
        subject = passwordResetSubject()
        html = passwordResetTemplate(templateData)
        break
      case "order-placed":
        subject = orderPlacedSubject(templateData)
        html = orderPlacedTemplate(templateData)
        break
      case "order-canceled":
        subject = orderCanceledSubject(templateData)
        html = orderCanceledTemplate(templateData)
        break
      case "order-shipped":
        subject = orderShippedSubject(templateData)
        html = orderShippedTemplate(templateData)
        break
      case "invite-user":
        subject = inviteUserSubject()
        html = inviteUserTemplate(templateData)
        break
      case "payment-customer":
        subject = paymentCustomerSubject(templateData)
        html = paymentCustomerTemplate(templateData)
        break
      case "order-fulfillment":
        subject = orderFulfillmentSubject(templateData)
        html = orderFulfillmentTemplate(templateData)
        break
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unknown email template: ${template}`
        )
    }

    const { transporter, from } = await this.getTransporter()

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    })

    return { id: info.messageId }
  }
}

export default SmtpNotificationService
