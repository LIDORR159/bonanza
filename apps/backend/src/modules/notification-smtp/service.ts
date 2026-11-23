import type { Logger, NotificationTypes } from "@medusajs/framework/types"
import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import nodemailer, { type Transporter } from "nodemailer"

type SmtpOptions = {
  host: string
  port: number
  secure?: boolean
  user?: string
  password?: string
  from: string
}

type InjectedDependencies = {
  logger: Logger
}

/**
 * Sends email over SMTP. It is a transport only: callers render the message
 * and pass it in `content` (see src/lib/emails).
 */
class SmtpNotificationProviderService extends AbstractNotificationProviderService {
  static identifier = "smtp"

  protected readonly logger_: Logger
  protected readonly options_: SmtpOptions
  protected readonly transporter_: Transporter

  static validateOptions(options: Record<string, unknown>) {
    for (const key of ["host", "port", "from"]) {
      if (!options[key]) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `SMTP notification provider: option "${key}" is required.`
        )
      }
    }
  }

  constructor({ logger }: InjectedDependencies, options: SmtpOptions) {
    super()
    this.logger_ = logger
    this.options_ = options
    this.transporter_ = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.secure ?? false,
      auth: options.user ? { user: options.user, pass: options.password } : undefined,
    })
  }

  async send(
    notification: NotificationTypes.ProviderSendNotificationDTO
  ): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
    const content = notification.content
    if (!content?.subject || (!content.html && !content.text)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Email "${notification.template}" has no rendered subject or body.`
      )
    }

    const info = await this.transporter_.sendMail({
      from: notification.from || this.options_.from,
      to: notification.to,
      subject: content.subject,
      html: content.html ?? undefined,
      text: content.text ?? undefined,
    })

    this.logger_.debug(`Email "${notification.template}" sent (${info.messageId})`)
    return { id: info.messageId }
  }
}

export default SmtpNotificationProviderService
