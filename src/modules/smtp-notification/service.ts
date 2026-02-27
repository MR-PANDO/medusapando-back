import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import nodemailer, { type Transporter } from "nodemailer"
import { abandonedCartTemplate } from "./templates/abandoned-cart"

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

type SendNotificationInput = {
  to: string
  channel: string
  template: string
  data: Record<string, unknown>
}

type ProviderSendNotificationResultsDTO = {
  id: string
}

class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-smtp"

  private transporter: Transporter
  private from: string
  private storefrontUrl: string

  constructor(container: Record<string, unknown>, options: SmtpOptions) {
    super()

    this.from = options.from
    this.storefrontUrl = options.storefront_url

    this.transporter = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure,
      auth: {
        user: options.auth.user,
        pass: options.auth.pass,
      },
    })
  }

  async send(
    notification: SendNotificationInput
  ): Promise<ProviderSendNotificationResultsDTO> {
    const { to, template, data } = notification

    let subject: string
    let html: string

    switch (template) {
      case "abandoned-cart":
        subject = "Tu carrito te espera en NutriMercados"
        html = abandonedCartTemplate({
          ...data,
          storefront_url: this.storefrontUrl,
        })
        break
      default:
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `Unknown email template: ${template}`
        )
    }

    const info = await this.transporter.sendMail({
      from: this.from,
      to,
      subject,
      html,
    })

    return { id: info.messageId }
  }
}

export default SmtpNotificationService
