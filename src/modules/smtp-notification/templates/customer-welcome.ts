import { emailWrapper, escapeHtml, BRAND_COLOR } from "./shared"

type CustomerWelcomeData = {
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function customerWelcomeSubject(): string {
  return "Bienvenido a NutriMercados"
}

export function customerWelcomeTemplate(data: CustomerWelcomeData): string {
  const name = data.customer_name || ""
  const storefrontUrl = data.storefront_url || "https://nutrimercados.com"
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"

  return emailWrapper(`
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      ${greeting}
    </p>
    <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
      Tu cuenta ha sido creada exitosamente. Ahora puedes acceder a todos nuestros productos saludables y hacer seguimiento de tus pedidos.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(storefrontUrl)}/co/store" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
            Explorar productos
          </a>
        </td>
      </tr>
    </table>
    <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
      Si tienes alguna pregunta, no dudes en contactarnos.
    </p>`)
}
