import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { WOMPI_MODULE } from "../../../../modules/wompi"
import type WompiModuleService from "../../../../modules/wompi/service"
import { WOMPI_ORDER_STATUSES } from "../../../../modules/wompi/types"
import { sendPaymentLinkEmail } from "../../../../utils/wompi-email"

// POST /admin/wompi/generate-link
// Body: { order_id: string }
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { order_id } = req.body as { order_id?: string }

  if (!order_id || typeof order_id !== "string") {
    return res.status(400).json({ error: "order_id is required" })
  }

  const orderService = req.scope.resolve(Modules.ORDER) as any
  const wompiService = req.scope.resolve<WompiModuleService>(WOMPI_MODULE)

  // Check if a link already exists for this order
  const existingPayment = await wompiService.findByOrderId(order_id)
  if (
    existingPayment &&
    ["link_ready", "pending"].includes(existingPayment.wompi_status)
  ) {
    return res.status(409).json({
      error: "A payment link already exists for this order",
      wompi_payment: existingPayment,
    })
  }

  let order: any
  try {
    order = await orderService.retrieveOrder(order_id, {
      relations: [
        "items",
        "items.tax_lines",
        "items.adjustments",
        "shipping_address",
        "shipping_methods",
        "shipping_methods.tax_lines",
        "shipping_methods.adjustments",
        "summary",
      ],
    })
  } catch {
    return res.status(404).json({ error: "Order not found" })
  }

  const reference = order.display_id?.toString() ?? order.id

  // In Medusa v2, order.total is a computed BigNumber field.
  // Extract the numeric value from BigNumber or plain number.
  const rawTotal =
    order.total ?? order.summary?.current_order_total ?? 0
  const orderTotal = typeof rawTotal === "object"
    ? Number(rawTotal.value ?? rawTotal.numeric ?? 0)
    : Number(rawTotal)

  if (!orderTotal || orderTotal <= 0) {
    return res
      .status(400)
      .json({ error: `Order total must be greater than 0 (got ${orderTotal})` })
  }

  // Medusa v2 stores COP amounts as whole pesos (0 decimal places).
  // Wompi expects amount_in_cents: 28800 COP → 2880000 centavos.
  const amountInCents = Math.round(orderTotal * 100)

  try {
    // Update order status to generating
    await orderService.updateOrders([
      {
        id: order.id,
        metadata: {
          wompi_status: WOMPI_ORDER_STATUSES.LINK_GENERATING,
        },
      },
    ])

    // Create payment link via Wompi Module service (the Medusa v2 way)
    const { paymentLinkId, checkoutUrl } =
      await wompiService.createPaymentLink({
        orderId: order.id,
        reference,
        amountInCents,
        customerEmail: order.email ?? undefined,
        customerName: order.shipping_address
          ? `${order.shipping_address.first_name ?? ""} ${order.shipping_address.last_name ?? ""}`.trim()
          : undefined,
      })

    // Save payment record
    const paymentRecord = await wompiService.createPaymentRecord({
      orderId: order.id,
      reference,
      amountInCents,
      paymentLinkId,
      checkoutUrl,
      customerEmail: order.email ?? undefined,
    })

    // Update order metadata
    await orderService.updateOrders([
      {
        id: order.id,
        metadata: {
          wompi_status: WOMPI_ORDER_STATUSES.LINK_READY,
          wompi_payment_link_id: paymentLinkId,
          wompi_checkout_url: checkoutUrl,
        },
      },
    ])

    // Send payment link email to customer
    if (order.email) {
      try {
        const customerName = order.shipping_address
          ? `${order.shipping_address.first_name ?? ""} ${order.shipping_address.last_name ?? ""}`.trim()
          : undefined

        const items = (order.items ?? []).map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          thumbnail: item.thumbnail,
          unit_price: item.unit_price,
        }))

        await sendPaymentLinkEmail({
          to: order.email,
          customerName,
          reference,
          amountInCents,
          checkoutUrl,
          items,
        })
      } catch (emailErr) {
        console.error("[Wompi] Payment link email failed (non-blocking):", emailErr)
      }
    }

    res.status(201).json({ wompi_payment: paymentRecord })
  } catch (err: any) {
    console.error("[Wompi] Failed to generate payment link:", err)

    // Revert order status
    try {
      await orderService.updateOrders([
        {
          id: order.id,
          metadata: {
            wompi_status: WOMPI_ORDER_STATUSES.LINK_ERROR,
          },
        },
      ])
    } catch {
      // Best effort
    }

    res.status(500).json({ error: "Failed to generate payment link" })
  }
}
