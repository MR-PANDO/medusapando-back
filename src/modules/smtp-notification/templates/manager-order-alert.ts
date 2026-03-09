import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  STORE_NAME,
  BRAND_GREEN,
  BRAND_ORANGE,
} from "./shared"

type ManagerAlertData = {
  event_label?: string
  order_id?: string
  display_id?: string | number
  customer_name?: string
  customer_email?: string
  details?: string
  icon?: string
  icon_bg?: string
  admin_url?: string
  [key: string]: unknown
}

export function managerOrderAlertSubject(data: ManagerAlertData): string {
  const ref = data.display_id || data.order_id || ""
  const label = data.event_label || "Notificacion de pedido"
  return `[Admin] ${label} — Pedido #${ref}`
}

export function managerOrderAlertTemplate(data: ManagerAlertData): string {
  const ref = String(data.display_id || data.order_id || "")
  const icon = data.icon || "&#128276;"
  const iconBg = data.icon_bg || "#f0f7ec"
  const label = data.event_label || "Notificacion de pedido"
  const adminUrl = data.admin_url || `${process.env.BACKEND_URL || "https://admin.nutrimercados.com"}/app/orders/${data.order_id || ""}`

  const content = `
    <!-- Alert icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: ${iconBg}; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">${icon}</span>
      </div>
    </div>

    ${sectionTitle(label)}
    ${paragraph(`Se ha generado una accion en el pedido <strong>#${escapeHtml(ref)}</strong> que requiere tu atencion.`)}

    ${infoBox(`
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 4px 0;">
            <span style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Pedido</span><br/>
            <span style="font-family: 'Inter', Arial, sans-serif; font-size: 15px; color: #1F2937; font-weight: 600;">#${escapeHtml(ref)}</span>
          </td>
        </tr>
        ${data.customer_name ? `<tr>
          <td style="padding: 4px 0;">
            <span style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Cliente</span><br/>
            <span style="font-family: 'Inter', Arial, sans-serif; font-size: 15px; color: #1F2937;">${escapeHtml(data.customer_name)}</span>
            ${data.customer_email ? ` <span style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #6B7280;">(${escapeHtml(data.customer_email)})</span>` : ""}
          </td>
        </tr>` : ""}
        ${data.details ? `<tr>
          <td style="padding: 4px 0;">
            <span style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">Detalles</span><br/>
            <span style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151;">${data.details}</span>
          </td>
        </tr>` : ""}
      </table>
    `)}

    ${ctaButton(adminUrl, "Ver en el admin")}
    ${paragraph("Este es un correo automatico para el equipo de administracion.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `[Admin] ${label} — Pedido #${ref} — ${STORE_NAME}`,
  })
}
