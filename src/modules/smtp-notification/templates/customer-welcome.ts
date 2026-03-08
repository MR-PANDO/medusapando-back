import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
} from "./shared"

type CustomerWelcomeData = {
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function customerWelcomeSubject(): string {
  return `Bienvenido a ${STORE_NAME}`
}

export function customerWelcomeTemplate(data: CustomerWelcomeData): string {
  const name = data.customer_name || ""
  const storefrontUrl = data.storefront_url || STORE_URL
  const greeting = name ? `Hola ${escapeHtml(name)},` : "Hola,"

  const content = `
    ${sectionTitle("Bienvenido a tu mercado saludable")}
    ${paragraph(greeting)}
    ${paragraph("Tu cuenta ha sido creada exitosamente. Ahora puedes disfrutar de todos nuestros productos naturales, organicos y saludables.")}

    <div style="background: linear-gradient(135deg, #f0f7ec 0%, #fdf6f0 100%); border-radius: 10px; padding: 24px; margin: 20px 0; border-left: 4px solid ${BRAND_GREEN};">
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 15px; color: #374151; margin: 0 0 8px; font-weight: 600;">Con tu cuenta puedes:</p>
      <ul style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #4B5563; margin: 0; padding-left: 20px; line-height: 2;">
        <li>Explorar nuestro catalogo de productos saludables</li>
        <li>Hacer seguimiento de tus pedidos</li>
        <li>Guardar tus direcciones de envio</li>
        <li>Acceder a ofertas exclusivas</li>
      </ul>
    </div>

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/store`, "Explorar productos")}
    ${paragraph("Si tienes alguna pregunta, no dudes en contactarnos por WhatsApp o correo. Estamos para ayudarte.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Bienvenido a ${STORE_NAME} — tu mercado saludable desde 2012`,
  })
}
