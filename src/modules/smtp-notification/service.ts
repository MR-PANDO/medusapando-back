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
