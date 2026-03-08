# Medusa v2 Events Reference

All events emitted by Medusa v2 core that can be used to trigger email notifications, webhooks, or any custom subscriber logic.

Source: `@medusajs/utils` v2.12.1 + [Official Medusa Documentation](https://docs.medusajs.com/resources/events-reference)

---

## How to Use

Create a subscriber in `src/subscribers/`:

```typescript
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

export default async function handler({ event: { data }, container }: SubscriberArgs<{ id: string }>) {
  // Your logic here — resolve services from container, send emails, etc.
}

export const config: SubscriberConfig = {
  event: "order.placed",  // <-- event name from the tables below
}
```

---

## Workflow Events (High-Level)

These are emitted by Medusa workflows (core-flows). **Best for building notifications.**

The "Emitted By" column shows which workflow triggers each event — useful for understanding *when* and *why* an event fires.

### Cart Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `cart.created` | `{ id }` | `createCartWorkflow` | Cart created |
| `cart.updated` | `{ id }` | `updateCartWorkflow`, `addShippingMethodToCartWorkflow`, `addToCartWorkflow`, `updateLineItemInCartWorkflow`, `deleteLineItemsWorkflow`, `transferCartCustomerWorkflow` | Cart details updated |
| `cart.customer_updated` | `{ id }` | `transferCartCustomerWorkflow` | Customer in cart changed |
| `cart.region_updated` | `{ id }` | `updateCartWorkflow` | Cart region changed (also emits `cart.updated`) |
| `cart.customer_transferred` | `{ id, customer_id }` | `transferCartCustomerWorkflow` | Cart transferred to another customer *(since 2.8)* |

### Customer Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `customer.created` | `{ id }` | `createCustomerAccountWorkflow`, `createCustomersWorkflow` | New customer registered |
| `customer.updated` | `{ id }` | `updateCustomersWorkflow` | Customer profile updated |
| `customer.deleted` | `{ id }` | `deleteCustomersWorkflow` | Customer deleted |

### Order Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `order.placed` | `{ id }` | `completeCartWorkflow` | Order placed (or draft order converted) |
| `order.updated` | `{ id }` | `updateOrderWorkflow` | Order details updated (not via edit) |
| `order.canceled` | `{ id }` | `cancelOrderWorkflow` | Order canceled |
| `order.completed` | `{ id }` | `completeOrderWorkflow` | Order marked as completed |
| `order.archived` | `{ id }` | `archiveOrderWorkflow` | Order archived |
| `order.fulfillment_created` | `{ order_id, fulfillment_id, no_notification }` | `createOrderFulfillmentWorkflow` | Fulfillment created for order |
| `order.fulfillment_canceled` | `{ order_id, fulfillment_id, no_notification }` | `cancelOrderFulfillmentWorkflow` | Order fulfillment canceled |
| `order.return_requested` | `{ order_id, return_id }` | `confirmReturnRequestWorkflow` | Return request confirmed |
| `order.return_received` | `{ order_id, return_id }` | `confirmReceiveReturnRequestWorkflow` | Return marked as received |
| `order.claim_created` | `{ order_id, claim_id }` | `confirmClaimRequestWorkflow` | Claim created for order |
| `order.exchange_created` | `{ order_id, exchange_id }` | `confirmExchangeRequestWorkflow` | Exchange created for order |
| `order.transfer_requested` | `{ id, order_change_id }` | `requestOrderTransferWorkflow` | Order transfer to another customer requested |

### Order Edit Events *(since 2.8)*

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `order-edit.requested` | `{ order_id, actions[] }` | `requestOrderEditRequestWorkflow` | Order edit requested |
| `order-edit.confirmed` | `{ order_id, actions[] }` | `confirmOrderEditRequestWorkflow` | Order edit confirmed |
| `order-edit.canceled` | `{ order_id, actions[] }` | `cancelOrderEditRequestWorkflow` | Order edit canceled |

### Fulfillment Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `shipment.created` | `{ id, no_notification }` | `createShipmentWorkflow` | Shipment created (tracking info added) |
| `delivery.created` | `{ id }` | `markFulfillmentAsDeliveredWorkflow` | Fulfillment marked as delivered |

### Payment Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `payment.captured` | `{ id }` | `capturePaymentWorkflow` | Payment captured |
| `payment.refunded` | `{ id }` | `refundPaymentWorkflow` | Payment refunded |

### Auth Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `auth.password_reset` | `{ entity_id, actor_type, token }` | `generateResetPasswordTokenWorkflow` | Password reset token generated |

### User Events (Admin)

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `user.created` | `{ id }` | `createUsersWorkflow` | Admin user created |
| `user.updated` | `{ id }` | `updateUsersWorkflow` | Admin user updated |
| `user.deleted` | `{ id }` | `deleteUsersWorkflow` | Admin user deleted |

### Invite Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `invite.created` | `{ id }` | `createInvitesWorkflow` | Admin invite created |
| `invite.accepted` | `{ id }` | `acceptInviteWorkflow` | Invite accepted |
| `invite.deleted` | `{ id }` | `deleteInvitesWorkflow` | Invite deleted |
| `invite.resent` | `{ id }` | `refreshInviteTokensWorkflow` | Invite resent (token refreshed) |

### Product Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `product.created` | `{ id }` | `createProductsWorkflow` | Product created |
| `product.updated` | `{ id }` | `updateProductsWorkflow` | Product updated |
| `product.deleted` | `{ id }` | `deleteProductsWorkflow` | Product deleted |
| `product-variant.created` | `{ id }` | `createProductVariantsWorkflow` | Variant created |
| `product-variant.updated` | `{ id }` | `updateProductVariantsWorkflow` | Variant updated |
| `product-variant.deleted` | `{ id }` | `deleteProductVariantsWorkflow` | Variant deleted |
| `product-category.created` | `{ id }` | `createProductCategoriesWorkflow` | Category created |
| `product-category.updated` | `{ id }` | `updateProductCategoriesWorkflow` | Category updated |
| `product-category.deleted` | `{ id }` | `deleteProductCategoriesWorkflow` | Category deleted |
| `product-collection.created` | `{ id }` | `createCollectionsWorkflow` | Collection created |
| `product-collection.updated` | `{ id }` | `updateCollectionsWorkflow` | Collection updated |
| `product-collection.deleted` | `{ id }` | `deleteCollectionsWorkflow` | Collection deleted |
| `product-type.created` | `{ id }` | `createProductTypesWorkflow` | Product type created |
| `product-type.updated` | `{ id }` | `updateProductTypesWorkflow` | Product type updated |
| `product-type.deleted` | `{ id }` | `deleteProductTypesWorkflow` | Product type deleted |
| `product-tag.created` | `{ id }` | `createProductTagsWorkflow` | Product tag created |
| `product-tag.updated` | `{ id }` | `updateProductTagsWorkflow` | Product tag updated |
| `product-tag.deleted` | `{ id }` | `deleteProductTagsWorkflow` | Product tag deleted |
| `product-option.created` | `{ id }` | `createProductOptionsWorkflow` | Product option created |
| `product-option.updated` | `{ id }` | `updateProductOptionsWorkflow` | Product option updated |
| `product-option.deleted` | `{ id }` | `deleteProductOptionsWorkflow` | Product option deleted |

### Sales Channel Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `sales-channel.created` | `{ id }` | `createSalesChannelsWorkflow` | Sales channel created |
| `sales-channel.updated` | `{ id }` | `updateSalesChannelsWorkflow` | Sales channel updated |
| `sales-channel.deleted` | `{ id }` | `deleteSalesChannelsWorkflow` | Sales channel deleted |

### Region Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `region.created` | `{ id }` | `createRegionsWorkflow` | Region created |
| `region.updated` | `{ id }` | `updateRegionsWorkflow` | Region updated |
| `region.deleted` | `{ id }` | `deleteRegionsWorkflow` | Region deleted |

### Shipping Option Type Events *(since 2.10)*

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `shipping-option-type.created` | `{ id }` | `createShippingOptionsWorkflow` | Shipping option type created |
| `shipping-option-type.updated` | `{ id }` | `updateShippingOptionsWorkflow` | Shipping option type updated |
| `shipping-option-type.deleted` | `{ id }` | `deleteShippingOptionsWorkflow` | Shipping option type deleted |

### Stock Location Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `stock-location.created` | `{ id }` | `createStockLocationsWorkflow` | Stock location created |
| `stock-location.updated` | `{ id }` | `updateStockLocationsWorkflow` | Stock location updated |
| `stock-location.deleted` | `{ id }` | `deleteStockLocationsWorkflow` | Stock location deleted |

### Promotion Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `promotion.created` | `{ id }` | `createPromotionsWorkflow` | Promotion created |
| `promotion.updated` | `{ id }` | `updatePromotionsWorkflow` | Promotion updated |
| `promotion.deleted` | `{ id }` | `deletePromotionsWorkflow` | Promotion deleted |

### Campaign Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `campaign.created` | `{ id }` | `createCampaignsWorkflow` | Campaign created |
| `campaign.updated` | `{ id }` | `updateCampaignsWorkflow` | Campaign updated |
| `campaign.deleted` | `{ id }` | `deleteCampaignsWorkflow` | Campaign deleted |

### Price List Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `price-list.created` | `{ id }` | `createPriceListsWorkflow` | Price list created |
| `price-list.updated` | `{ id }` | `updatePriceListsWorkflow` | Price list updated |
| `price-list.deleted` | `{ id }` | `deletePriceListsWorkflow` | Price list deleted |

### API Key Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `api-key.created` | `{ id }` | `createApiKeysWorkflow` | API key created |
| `api-key.updated` | `{ id }` | `updateApiKeysWorkflow` | API key updated |
| `api-key.revoked` | `{ id }` | `revokeApiKeysWorkflow` | API key revoked |
| `api-key.deleted` | `{ id }` | `deleteApiKeysWorkflow` | API key deleted |

### Tax Events

| Event | Payload | Emitted By | Description |
|-------|---------|------------|-------------|
| `tax-rate.created` | `{ id }` | `createTaxRatesWorkflow` | Tax rate created |
| `tax-rate.updated` | `{ id }` | `updateTaxRatesWorkflow` | Tax rate updated |
| `tax-rate.deleted` | `{ id }` | `deleteTaxRatesWorkflow` | Tax rate deleted |
| `tax-region.created` | `{ id }` | `createTaxRegionsWorkflow` | Tax region created |
| `tax-region.deleted` | `{ id }` | `deleteTaxRegionsWorkflow` | Tax region deleted |

---

## Module-Level Events (Low-Level)

These are auto-generated CRUD events for every entity in each module. Format: `{module}.{entity}.{action}`

Actions: `created`, `updated`, `deleted`, `restored`, `attached`, `detached`

### Inventory Module

| Entity | Event Pattern | Example |
|--------|---------------|---------|
| Inventory Item | `inventory.inventory_item.{action}` | `inventory.inventory_item.updated` |
| Reservation Item | `inventory.reservation_item.{action}` | `inventory.reservation_item.created` |
| Inventory Level | `inventory.inventory_level.{action}` | `inventory.inventory_level.updated` |

### Fulfillment Module

| Entity | Event Pattern |
|--------|---------------|
| Fulfillment Set | `fulfillment.fulfillment_set.{action}` |
| Service Zone | `fulfillment.service_zone.{action}` |
| Geo Zone | `fulfillment.geo_zone.{action}` |
| Shipping Option | `fulfillment.shipping_option.{action}` |
| Shipping Option Type | `fulfillment.shipping_option_type.{action}` |
| Shipping Profile | `fulfillment.shipping_profile.{action}` |
| Shipping Option Rule | `fulfillment.shipping_option_rule.{action}` |
| Fulfillment | `fulfillment.fulfillment.{action}` |
| Fulfillment Address | `fulfillment.fulfillment_address.{action}` |
| Fulfillment Item | `fulfillment.fulfillment_item.{action}` |
| Fulfillment Label | `fulfillment.fulfillment_label.{action}` |

### Product Module

| Entity | Event Pattern |
|--------|---------------|
| Product | `product.product.{action}` |
| Product Variant | `product.product_variant.{action}` |
| Product Option | `product.product_option.{action}` |
| Product Option Value | `product.product_option_value.{action}` |
| Product Type | `product.product_type.{action}` |
| Product Tag | `product.product_tag.{action}` |
| Product Category | `product.product_category.{action}` |
| Product Collection | `product.product_collection.{action}` |
| Product Image | `product.product_image.{action}` |

### Pricing Module

| Entity | Event Pattern |
|--------|---------------|
| Price List | `pricing.price_list.{action}` |
| Price List Rule | `pricing.price_list_rule.{action}` |
| Price Rule | `pricing.price_rule.{action}` |
| Price Set | `pricing.price_set.{action}` |
| Price | `pricing.price.{action}` |

### User Module

| Entity | Event Pattern |
|--------|---------------|
| User | `user.user.{action}` |
| Invite | `user.invite.{action}` |

Special: `user.user.invite.token_generated` — emitted when invite token is generated.

### Order Module

| Entity | Event Pattern |
|--------|---------------|
| Order | `order.order.{action}` |
| Order Address | `order.order_address.{action}` |
| Order Change | `order.order_change.{action}` |
| Order Change Action | `order.order_change_action.{action}` |
| Order Claim | `order.order_claim.{action}` |
| Order Exchange | `order.order_exchange.{action}` |
| Order Item | `order.order_item.{action}` |
| Order Line Item | `order.order_line_item.{action}` |
| Order Shipping Method | `order.order_shipping_method.{action}` |
| Order Transaction | `order.order_transaction.{action}` |
| Return | `order.return.{action}` |
| Return Item | `order.return_item.{action}` |
| Return Reason | `order.return_reason.{action}` |

### Cart Module

| Entity | Event Pattern |
|--------|---------------|
| Cart | `cart.cart.{action}` |
| Line Item | `cart.line_item.{action}` |
| Line Item Adjustment | `cart.line_item_adjustment.{action}` |
| Shipping Method | `cart.shipping_method.{action}` |
| Shipping Method Adjustment | `cart.shipping_method_adjustment.{action}` |

### Customer Module

| Entity | Event Pattern |
|--------|---------------|
| Customer | `customer.customer.{action}` |
| Customer Address | `customer.customer_address.{action}` |
| Customer Group | `customer.customer_group.{action}` |
| Customer Group Customer | `customer.customer_group_customer.{action}` |

### Payment Module

| Entity | Event Pattern |
|--------|---------------|
| Payment | `payment.payment.{action}` |
| Payment Collection | `payment.payment_collection.{action}` |
| Payment Session | `payment.payment_session.{action}` |
| Refund | `payment.refund.{action}` |

### Region Module

| Entity | Event Pattern |
|--------|---------------|
| Region | `region.region.{action}` |

### Sales Channel Module

| Entity | Event Pattern |
|--------|---------------|
| Sales Channel | `sales_channel.sales_channel.{action}` |

### Promotion Module

| Entity | Event Pattern |
|--------|---------------|
| Promotion | `promotion.promotion.{action}` |
| Promotion Rule | `promotion.promotion_rule.{action}` |
| Campaign | `promotion.campaign.{action}` |

### Tax Module

| Entity | Event Pattern |
|--------|---------------|
| Tax Rate | `tax.tax_rate.{action}` |
| Tax Region | `tax.tax_region.{action}` |
| Tax Rate Rule | `tax.tax_rate_rule.{action}` |

### API Key Module

| Entity | Event Pattern |
|--------|---------------|
| API Key | `api_key.api_key.{action}` |

### Auth Module

| Entity | Event Pattern |
|--------|---------------|
| Auth Identity | `auth.auth_identity.{action}` |
| Provider Identity | `auth.provider_identity.{action}` |

### Stock Location Module

| Entity | Event Pattern |
|--------|---------------|
| Stock Location | `stock_location.stock_location.{action}` |
| Stock Location Address | `stock_location.stock_location_address.{action}` |

### Currency Module

| Entity | Event Pattern |
|--------|---------------|
| Currency | `currency.currency.{action}` |

### Store Module

| Entity | Event Pattern |
|--------|---------------|
| Store | `store.store.{action}` |

### Notification Module

| Entity | Event Pattern |
|--------|---------------|
| Notification | `notification.notification.{action}` |

---

## Vita Integral — Currently Implemented

| Event | Subscriber | Email Template | Recipient |
|-------|-----------|---------------|-----------|
| Event | Subscriber | Email Template | Recipient |
|-------|-----------|---------------|-----------|
| `customer.created` | `customer-created.ts` | `customer-welcome` | Customer |
| `order.placed` | `order-placed.ts` | `order-placed` | Customer |
| `payment.captured` | `payment-captured.ts` | `payment-captured` | Customer |
| `order.fulfillment_created` | `order-fulfillment-created.ts` | `order-fulfillment` | Customer |
| `shipment.created` | `order-shipment-created.ts` | `order-shipped` | Customer |
| `delivery.created` | `order-delivered.ts` | `order-delivered` | Customer |
| `order.canceled` | `order-canceled.ts` | `order-canceled` | Customer |
| `auth.password_reset` | `password-reset.ts` | `password-reset` | Customer |
| `invite.created` | `invite-created.ts` | `invite-user` | Admin |
| `product.updated` | `product-updated.ts` | *(cache revalidation)* | - |
| *(scheduled)* | `abandoned-cart job` | `abandoned-cart` | Customer |
| *(Wompi webhook)* | `hooks/wompi/events` | `payment-customer` | Customer |
| *(Wompi webhook)* | `hooks/wompi/events` | `payment-status` | Admin |
| *(Admin action)* | `wompi/generate-link` | `payment-link` | Customer |

## Not Yet Implemented — Potential Additions

| Event | Use Case | Priority |
|-------|----------|----------|
| `payment.refunded` | Notify customer about refund | High |
| `order.completed` | Thank-you / review request email | Medium |
| `order.return_requested` | Confirm return request to customer | Medium |
| `order.return_received` | Notify customer return was received | Medium |
| `order.claim_created` | Notify customer about claim | Low |
| `order.exchange_created` | Notify customer about exchange | Low |
| `order.fulfillment_canceled` | Notify customer fulfillment was canceled | Low |
| `invite.resent` | Resend admin invite email | Low |
| `inventory.inventory_level.updated` | Low stock alert to admin | Low |
| `order.transfer_requested` | Notify about order ownership transfer | Low |
