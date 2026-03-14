import {
  emailWrapper,
  escapeHtml,
  sectionTitle,
  paragraph,
  divider,
  infoBox,
  BRAND_ORANGE,
} from "./shared"

type LowStockItem = {
  sku: string
  product_title: string
  variant_title: string
  quantity: number
  threshold: number
}

export function lowInventoryTemplate(data: {
  items: LowStockItem[]
  threshold: number
  sync_date: string
}): string {
  const { items, threshold, sync_date } = data

  const zeroStock = items.filter((i) => i.quantity === 0)
  const lowStock = items.filter((i) => i.quantity > 0)

  let itemsHtml = ""

  if (zeroStock.length > 0) {
    itemsHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="font-family: 'Inter', Arial, sans-serif; font-size: 15px; color: #DC2626; margin: 0 0 12px; font-weight: 600;">
          &#x26A0; Sin stock (${zeroStock.length} productos)
        </h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #FCA5A5; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #FEF2F2;">
              <th style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #991B1B; padding: 10px 12px; text-align: left; font-weight: 600;">SKU</th>
              <th style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #991B1B; padding: 10px 12px; text-align: left; font-weight: 600;">Producto</th>
              <th style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #991B1B; padding: 10px 12px; text-align: center; font-weight: 600;">Cant.</th>
            </tr>
          </thead>
          <tbody>
            ${zeroStock
              .map(
                (item, i) => `
              <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#FEF2F2"};">
                <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #374151; padding: 8px 12px; font-family: monospace;">${escapeHtml(item.sku)}</td>
                <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #374151; padding: 8px 12px;">
                  ${escapeHtml(item.product_title)}${item.variant_title ? ` <span style="color: #6B7280;">- ${escapeHtml(item.variant_title)}</span>` : ""}
                </td>
                <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #DC2626; padding: 8px 12px; text-align: center; font-weight: 600;">0</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
  }

  if (lowStock.length > 0) {
    itemsHtml += `
      <div style="margin-bottom: 20px;">
        <h3 style="font-family: 'Inter', Arial, sans-serif; font-size: 15px; color: #D97706; margin: 0 0 12px; font-weight: 600;">
          &#x26A0; Stock bajo (${lowStock.length} productos, &lt; ${threshold} uds.)
        </h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #FCD34D; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background-color: #FFFBEB;">
              <th style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #92400E; padding: 10px 12px; text-align: left; font-weight: 600;">SKU</th>
              <th style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #92400E; padding: 10px 12px; text-align: left; font-weight: 600;">Producto</th>
              <th style="font-family: 'Inter', Arial, sans-serif; font-size: 12px; color: #92400E; padding: 10px 12px; text-align: center; font-weight: 600;">Cant.</th>
            </tr>
          </thead>
          <tbody>
            ${lowStock
              .map(
                (item, i) => `
              <tr style="background-color: ${i % 2 === 0 ? "#ffffff" : "#FFFBEB"};">
                <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #374151; padding: 8px 12px; font-family: monospace;">${escapeHtml(item.sku)}</td>
                <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #374151; padding: 8px 12px;">
                  ${escapeHtml(item.product_title)}${item.variant_title ? ` <span style="color: #6B7280;">- ${escapeHtml(item.variant_title)}</span>` : ""}
                </td>
                <td style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #D97706; padding: 8px 12px; text-align: center; font-weight: 600;">${item.quantity}</td>
              </tr>`
              )
              .join("")}
          </tbody>
        </table>
      </div>`
  }

  const content = `
    ${sectionTitle("Alerta de inventario bajo")}
    ${paragraph(`Se detectaron <strong>${items.length} producto(s)</strong> con inventario por debajo del limite configurado (<strong>${threshold} unidades</strong>) despues de la sincronizacion con Nubex ERP.`)}
    ${divider()}
    ${itemsHtml}
    ${infoBox(`
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 13px; color: #374151; margin: 0;">
        <strong>Fecha de sincronizacion:</strong> ${escapeHtml(sync_date)}<br/>
        <strong>Total productos con stock bajo:</strong> ${items.length}
      </p>
    `)}
    ${paragraph("Revisa el inventario en el panel de administracion para tomar las acciones necesarias.", { muted: true, small: true })}
  `

  return emailWrapper(content, {
    preheader: `Alerta: ${items.length} producto(s) con inventario bajo`,
  })
}
