type AbandonedCartData = {
  storefront_url?: string
  cart_id?: string
  items?: Array<{
    title?: string
    quantity?: number
    thumbnail?: string
    variant_title?: string
    unit_price?: number
  }>
  customer_name?: string
  [key: string]: unknown
}

export function abandonedCartTemplate(data: AbandonedCartData): string {
  const storefrontUrl = data.storefront_url || "https://nutrimercados.com"
  const cartId = data.cart_id || ""
  const items = data.items || []
  const customerName = data.customer_name || ""

  const recoveryUrl = `${storefrontUrl}/co/cart/recover/${cartId}`

  const greeting = customerName ? `Hola ${customerName},` : "Hola,"

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        ${
          item.thumbnail
            ? `<img src="${item.thumbnail}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />`
            : ""
        }
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; font-family: Arial, sans-serif;">
        <strong>${item.title || "Producto"}</strong>
        ${item.variant_title ? `<br/><span style="color: #666; font-size: 13px;">${item.variant_title}</span>` : ""}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-family: Arial, sans-serif;">
        ${item.quantity || 1}
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-family: Arial, sans-serif;">
        ${item.unit_price != null ? `$${(item.unit_price / 100).toLocaleString("es-CO")}` : ""}
      </td>
    </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #2d6a4f; padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; font-family: Arial, sans-serif; margin: 0; font-size: 24px;">
                NutriMercados
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
                ${greeting}
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 16px; color: #333; line-height: 1.6;">
                Notamos que dejaste algunos productos en tu carrito. No te preocupes, los guardamos para ti.
              </p>

              ${
                items.length > 0
                  ? `
              <!-- Items table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; border-collapse: collapse;">
                <tr style="background-color: #f9f9f9;">
                  <th style="padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #666;"></th>
                  <th style="padding: 10px; text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Producto</th>
                  <th style="padding: 10px; text-align: center; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Cant.</th>
                  <th style="padding: 10px; text-align: right; font-family: Arial, sans-serif; font-size: 13px; color: #666;">Precio</th>
                </tr>
                ${itemsHtml}
              </table>
              `
                  : ""
              }

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${recoveryUrl}" style="display: inline-block; background-color: #2d6a4f; color: #ffffff; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; text-decoration: none; padding: 14px 40px; border-radius: 8px;">
                      Completar mi compra
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-family: Arial, sans-serif; font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="font-family: Arial, sans-serif; font-size: 12px; color: #999; margin: 0;">
                NutriMercados &mdash; Tu tienda de productos saludables
              </p>
              <p style="font-family: Arial, sans-serif; font-size: 12px; color: #999; margin: 5px 0 0;">
                Este es un correo automatizado. Si no creaste este carrito, puedes ignorar este mensaje.
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
