import {
  createStep,
  StepResponse,
  createWorkflow,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { createCartWorkflow, addToCartWorkflow } from "@medusajs/medusa/core-flows"

export type ReorderInput = {
  order_id: string
  customer_id: string
}

export type SkippedItem = {
  variant_id: string
  product_title: string | null
  variant_title: string | null
  reason: "out_of_stock" | "no_inventory" | "variant_deleted" | "error"
}

export const prepareReorderDataStep = createStep(
  "prepare-reorder-data",
  async (input: ReorderInput, { container }) => {
    const query = container.resolve("query")

    // Fetch the original order with all necessary relations
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "customer_id",
        "region_id",
        "email",
        "currency_code",
        "shipping_address.*",
        "billing_address.*",
        "items.*",
        "items.variant_id",
        "items.quantity",
        "items.variant.*",
        "items.variant.product.*",
      ],
      filters: {
        id: input.order_id,
      },
    })

    if (!orders || orders.length === 0) {
      throw new Error(`Order ${input.order_id} not found`)
    }

    const order = orders[0] as any

    // Verify the customer owns this order
    if (order.customer_id !== input.customer_id) {
      throw new Error("You do not have access to this order")
    }

    // Collect items with their metadata for display purposes
    const orderItems = order.items
      .filter((item: any) => item.variant_id)
      .map((item: any) => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        product_title: item.variant?.product?.title || item.product_title || item.title,
        variant_title: item.variant?.title || item.variant_title,
      }))

    if (orderItems.length === 0) {
      throw new Error("No reorderable items found in this order")
    }

    // Prepare shipping address
    const shippingAddress = order.shipping_address
      ? {
          first_name: order.shipping_address.first_name,
          last_name: order.shipping_address.last_name,
          address_1: order.shipping_address.address_1,
          address_2: order.shipping_address.address_2,
          city: order.shipping_address.city,
          country_code: order.shipping_address.country_code,
          province: order.shipping_address.province,
          postal_code: order.shipping_address.postal_code,
          phone: order.shipping_address.phone,
          company: order.shipping_address.company,
        }
      : undefined

    const billingAddress = order.billing_address
      ? {
          first_name: order.billing_address.first_name,
          last_name: order.billing_address.last_name,
          address_1: order.billing_address.address_1,
          address_2: order.billing_address.address_2,
          city: order.billing_address.city,
          country_code: order.billing_address.country_code,
          province: order.billing_address.province,
          postal_code: order.billing_address.postal_code,
          phone: order.billing_address.phone,
          company: order.billing_address.company,
        }
      : undefined

    return new StepResponse({
      region_id: order.region_id,
      email: order.email,
      currency_code: order.currency_code,
      order_items: orderItems,
      shipping_address: shippingAddress,
      billing_address: billingAddress,
    })
  }
)

export const createReorderCartStep = createStep(
  "create-reorder-cart",
  async (
    input: {
      region_id: string
      email: string
      currency_code: string
      order_items: Array<{
        variant_id: string
        quantity: number
        product_title: string | null
        variant_title: string | null
      }>
      shipping_address?: Record<string, any>
      billing_address?: Record<string, any>
    },
    { container }
  ) => {
    // Create cart WITHOUT items first
    const { result: cart } = await createCartWorkflow(container).run({
      input: {
        region_id: input.region_id,
        email: input.email,
        currency_code: input.currency_code,
        shipping_address: input.shipping_address,
        billing_address: input.billing_address,
      },
    })

    // Add items one by one, tracking which ones fail
    const skippedItems: SkippedItem[] = []
    let addedCount = 0

    for (const item of input.order_items) {
      try {
        await addToCartWorkflow(container).run({
          input: {
            cart_id: cart.id,
            items: [
              {
                variant_id: item.variant_id,
                quantity: item.quantity,
              },
            ],
          },
        })
        addedCount++
      } catch (error: any) {
        const message = error?.message?.toLowerCase() || ""
        let reason: SkippedItem["reason"] = "error"

        if (message.includes("inventory") || message.includes("stock")) {
          reason = "no_inventory"
        } else if (message.includes("not found") || message.includes("does not exist")) {
          reason = "variant_deleted"
        }

        skippedItems.push({
          variant_id: item.variant_id,
          product_title: item.product_title,
          variant_title: item.variant_title,
          reason,
        })
      }
    }

    if (addedCount === 0) {
      throw new Error(
        "No items could be added to the cart. All items are out of stock or no longer available."
      )
    }

    return new StepResponse(
      { cart, skipped_items: skippedItems },
      cart.id
    )
  }
)

export const reorderWorkflow = createWorkflow(
  "reorder",
  (input: ReorderInput) => {
    const orderData = prepareReorderDataStep(input)

    const result = createReorderCartStep(orderData)

    return new WorkflowResponse(result)
  }
)
