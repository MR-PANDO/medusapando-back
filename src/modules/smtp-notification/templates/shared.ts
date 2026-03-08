const BRAND_GREEN = "#5B8C3E"
const BRAND_ORANGE = "#DA763E"
const STORE_NAME = "Vita Integral"
const STORE_URL = "https://nutrimercados.com"
const STORE_EMAIL = "info@vitaintegral.co"
const STORE_PHONE = "604 322 84 82 ext. 4"
const STORE_WHATSAPP = "+573122018760"
const STORE_ADDRESS = "Av. Nutibara Trv. 39B 77-40, Medellin"

export {
  BRAND_GREEN,
  BRAND_ORANGE,
  STORE_NAME,
  STORE_URL,
  STORE_EMAIL,
  STORE_PHONE,
  STORE_WHATSAPP,
  STORE_ADDRESS,
}

// Keep BRAND_COLOR as alias for backward compatibility
export const BRAND_COLOR = BRAND_GREEN

const FONT = `'Inter', Arial, Helvetica, sans-serif`

export function emailWrapper(content: string, options?: { preheader?: string }): string {
  const preheader = options?.preheader
    ? `<span style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${options.preheader}</span>`
    : ""

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6;">
  ${preheader}
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">

          <!-- Green accent line -->
          <tr>
            <td style="height: 4px; background: linear-gradient(90deg, ${BRAND_GREEN}, ${BRAND_ORANGE}, ${BRAND_GREEN});"></td>
          </tr>

          <!-- Header with logo -->
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; background-color: #ffffff;">
              <img src="${STORE_URL}/logo.svg" alt="${STORE_NAME}" width="180" style="display: inline-block; max-width: 180px; height: auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 32px 32px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <p style="font-family: ${FONT}; font-size: 13px; color: ${BRAND_GREEN}; margin: 0 0 4px; font-weight: 600;">
                      ${STORE_NAME}
                    </p>
                    <p style="font-family: ${FONT}; font-size: 12px; color: #6B7280; margin: 0 0 12px;">
                      Mercado saludable desde 2012
                    </p>
                    <p style="font-family: ${FONT}; font-size: 12px; color: #9CA3AF; margin: 0 0 4px;">
                      ${STORE_ADDRESS}
                    </p>
                    <p style="font-family: ${FONT}; font-size: 12px; color: #9CA3AF; margin: 0 0 12px;">
                      Tel: ${STORE_PHONE} &nbsp;|&nbsp;
                      <a href="mailto:${STORE_EMAIL}" style="color: ${BRAND_GREEN}; text-decoration: none;">${STORE_EMAIL}</a>
                    </p>
                    <!-- Social links -->
                    <p style="font-family: ${FONT}; font-size: 12px; margin: 0;">
                      <a href="https://www.instagram.com/vitaintegralmedellin" style="color: ${BRAND_GREEN}; text-decoration: none; margin: 0 8px;">Instagram</a>
                      <a href="https://www.facebook.com/VitaintegralMedellin" style="color: ${BRAND_GREEN}; text-decoration: none; margin: 0 8px;">Facebook</a>
                      <a href="https://wa.me/${STORE_WHATSAPP}" style="color: ${BRAND_GREEN}; text-decoration: none; margin: 0 8px;">WhatsApp</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Below-card note -->
        <table width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding: 16px 32px; text-align: center;">
              <p style="font-family: ${FONT}; font-size: 11px; color: #9CA3AF; margin: 0;">
                Este es un correo automatizado de ${STORE_NAME}. Por favor no responda a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(amount)
}

export function ctaButton(href: string, label: string, color?: string): string {
  const bg = color || BRAND_GREEN
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(href)}" style="display: inline-block; background-color: ${bg}; color: #ffffff; font-family: ${FONT}; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 36px; border-radius: 8px; letter-spacing: 0.3px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`
}

export function sectionTitle(text: string): string {
  return `<h2 style="font-family: ${FONT}; font-size: 20px; color: #1F2937; margin: 0 0 16px; font-weight: 600;">${text}</h2>`
}

export function paragraph(text: string, opts?: { muted?: boolean; center?: boolean; small?: boolean }): string {
  const color = opts?.muted ? "#6B7280" : "#374151"
  const size = opts?.small ? "13px" : "15px"
  const align = opts?.center ? "text-align: center;" : ""
  return `<p style="font-family: ${FONT}; font-size: ${size}; color: ${color}; line-height: 1.65; margin: 0 0 12px; ${align}">${text}</p>`
}

export function divider(): string {
  return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`
}

export function infoBox(content: string): string {
  return `<div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb;">${content}</div>`
}
