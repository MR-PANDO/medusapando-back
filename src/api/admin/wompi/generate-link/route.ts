import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { WOMPI_MODULE } from "../../../../modules/wompi"
import type WompiModuleService from "../../../../modules/wompi/service"
import { WOMPI_ORDER_STATUSES } from "../../../../modules/wompi/types"
import { sendPaymentLinkEmail } from "../../../../utils/wompi-email"
import type { PostAdminGenerateWompiLinkType } from "../validators"

// POST /admin/wompi/generate-link
// Body: { order_id: string }
export const POST = async (
  req: MedusaRequest<PostAdminGenerateWompiLinkType>,
  res: MedusaResponse
) => {
  const { order_id } = req.validatedBody

  try {
    const orderService = req.scope.resolve(Modules.ORDER) as any
    const wompiService = req.scope.resolve<WompiModuleService>(WOMPI_MODULE)

    // Step 1: Check for existing payment
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

    // Step 2: Retrieve order
    let order: any
    try {
      order = await orderService.retrieveOrder(order_id, {
        relations: ["items", "shipping_address", "summary"],
      })
    } catch (orderErr: any) {
      console.error("[Wompi] Order retrieval failed:", orderErr)
      return res.status(404).json({
        error: "Order not found",
        details: orderErr.message,
      })
    }

    // Step 3: Calculate total
    const reference = order.display_id?.toString() ?? order.id

    // Debug: log available total fields
    console.log("[Wompi] Order fields:", {
      total: order.total,
      summary: order.summary,
      item_total: order.item_total,
      currency_code: order.currency_code,
    })

    // Extract total — Medusa v2 BigNumber or plain number
    const rawTotal = order.total ?? order.summary?.current_order_total ?? 0
    const orderTotal =
      typeof rawTotal === "object"
        ? Number(rawTotal.value ?? rawTotal.numeric ?? rawTotal)
        : Number(rawTotal)

    if (!orderTotal || orderTotal <= 0) {
      return res.status(400).json({
        error: `Order total must be greater than 0`,
        debug: {
          raw_total: String(rawTotal),
          computed: orderTotal,
          total_type: typeof order.total,
          summary: order.summary
            ? JSON.stringify(order.summary).substring(0, 500)
            : null,
        },
      })
    }

    // Wompi expects amount_in_cents: COP pesos * 100
    const amountInCents = Math.round(orderTotal * 100)

    // Step 4: Update order metadata to generating
    await orderService.updateOrders(order.id, {
      metadata: {
        ...(order.metadata ?? {}),
        wompi_status: WOMPI_ORDER_STATUSES.LINK_GENERATING,
      },
    })

    // Step 5: Create Wompi payment link
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

    // Step 6: Save payment record
    const paymentRecord = await wompiService.createPaymentRecord({
      orderId: order.id,
      reference,
      amountInCents,
      paymentLinkId,
      checkoutUrl,
      customerEmail: order.email ?? undefined,
    })

    // Step 7: Update order metadata with link info
    await orderService.updateOrders(order.id, {
      metadata: {
        ...(order.metadata ?? {}),
        wompi_status: WOMPI_ORDER_STATUSES.LINK_READY,
        wompi_payment_link_id: paymentLinkId,
        wompi_checkout_url: checkoutUrl,
      },
    })

    // Step 8: Send email (non-blocking)
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
        console.error(
          "[Wompi] Payment link email failed (non-blocking):",
          emailErr
        )
      }
    }

    res.status(201).json({ wompi_payment: paymentRecord })
  } catch (err: any) {
    console.error("[Wompi] Failed to generate payment link:", err)

    // Best-effort revert
    try {
      const orderService = req.scope.resolve(Modules.ORDER) as any
      await orderService.updateOrders(order_id, {
        metadata: {
          wompi_status: WOMPI_ORDER_STATUSES.LINK_ERROR,
        },
      })
    } catch {
      // Best effort
    }

    res.status(500).json({
      error: "Failed to generate payment link",
      details: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined,
    })
  }
}
