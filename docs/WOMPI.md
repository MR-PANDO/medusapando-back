# Wompi Payment Integration

Documentation for the Wompi payment link system integrated with Medusa v2.

## Overview

Wompi is a Colombian payment processor. This integration uses **payment links** (not direct card tokenization) to collect payments. The flow is:

1. Admin generates a payment link from the order detail page
2. Customer receives an email with the payment link
3. Customer pays via Wompi checkout (supports cards, PSE, Nequi, Bancolombia, etc.)
4. Wompi sends a webhook with the payment result
5. Both admin and customer receive status emails

## Architecture

```
Admin Panel                    Wompi API                   Customer
    |                              |                          |
    |-- Generate link ----------->|                          |
    |<-- Link ID + checkout URL --|                          |
    |                              |                          |
    |-- Email with link ---------------------------------->  |
    |                              |                          |
    |                              |<-- Customer pays -----  |
    |                              |                          |
    |<-- Webhook (transaction.updated) --|                   |
    |                              |                          |
    |-- Update DB record           |                          |
    |-- Email admin (status)       |                          |
    |-- Email customer (result) --------------------------->  |
```

## Module Structure

| File | Purpose |
|------|---------|
| `src/modules/wompi/` | Custom Medusa module |
| `src/modules/wompi/models/wompi-payment.ts` | WompiPayment database model |
| `src/modules/wompi/service.ts` | Service: create links, update from webhook, queries |
| `src/modules/wompi/types.ts` | TypeScript types and constants |
| `src/api/hooks/wompi/events/route.ts` | Webhook endpoint (public, no auth) |
| `src/api/admin/wompi/route.ts` | Admin API: list payments |
| `src/api/admin/wompi/generate-link/route.ts` | Admin API: generate payment link |
| `src/api/admin/wompi/settings/route.ts` | Admin API: get Wompi settings |
| `src/admin/routes/wompi/page.tsx` | Admin page: payment dashboard |
| `src/admin/widgets/order-wompi-widget.tsx` | Admin widget: order detail sidebar |
| `src/utils/wompi-email.ts` | Email functions for payment notifications |
| `src/utils/wompi-signature.ts` | Webhook signature validation |

## Environment Variables

```env
# Required
WOMPI_PRIVATE_KEY=prv_prod_...          # Wompi private API key
WOMPI_EVENTS_SECRET=prod_events_...     # Webhook signature secret
WOMPI_ENVIRONMENT=production            # "sandbox" or "production"

# Optional
WOMPI_PAYMENT_MANAGER_EMAIL=admin@vitaintegral.co  # Receives payment status emails
WOMPI_EMAIL_NOTIFICATIONS=true                      # Set "false" to disable
STOREFRONT_URL=https://nutrimercados.com            # For redirect after payment
```

## WompiPayment Model

Database table: `wompi_payment`

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key |
| `order_id` | string | Medusa order ID |
| `reference` | string | Payment reference |
| `wompi_payment_link_id` | string | Wompi link ID |
| `wompi_checkout_url` | string | Checkout URL (`https://checkout.wompi.co/l/{id}`) |
| `wompi_transaction_id` | string? | Transaction ID (set by webhook) |
| `wompi_reference` | string? | Wompi's internal reference |
| `wompi_status` | string | `link_generating`, `link_ready`, `pending`, `approved`, `declined`, `voided`, `error` |
| `amount_in_cents` | number | Payment amount |
| `currency` | string | Default: `COP` |
| `customer_email` | string? | Customer email |
| `customer_name` | string? | Customer name |
| `customer_phone` | string? | Customer phone |
| `payment_method_type` | string? | e.g., `CARD`, `PSE`, `NEQUI` |
| `payment_method_detail` | string? | e.g., `Visa •••• 4242` |
| `link_generated_at` | Date? | When the link was created |
| `finalized_at` | Date? | When payment reached final status |
| `last_webhook_payload` | JSON? | Last webhook body for debugging |

## Payment Link Generation

### API Endpoint

```
POST /admin/wompi/generate-link
Content-Type: application/json
Authorization: Bearer <admin-token>

{
  "order_id": "order_01H..."
}
```

### Flow

1. Validates the order exists and has items
2. Checks for existing active payment link (returns 409 if found)
3. Calls Wompi API `POST /v1/payment_links`
4. Constructs checkout URL: `https://checkout.wompi.co/l/{linkId}`
5. Creates `WompiPayment` record
6. Updates order metadata with `wompi_checkout_url`
7. Sends payment link email to customer
8. Returns the payment record

### Wompi API Note

The Wompi API does **not** return a `permalink` field. The checkout URL must be constructed manually:
```
https://checkout.wompi.co/l/{payment_link_id}
```

## Webhook Handler

### Endpoint

```
POST /hooks/wompi/events
```

This is a **public endpoint** (no authentication). Security is handled via signature validation.

### Signature Validation

Uses HMAC-SHA256 with timing-safe comparison:
1. Concatenates signature properties from the payload
2. Appends the timestamp
3. Appends `WOMPI_EVENTS_SECRET`
4. Computes SHA256 hash
5. Compares with `signature.checksum` using `timingSafeEqual`

### Processing Steps

1. Validate payload structure
2. Validate signature
3. Only process `transaction.updated` events
4. Check for duplicate processing (idempotency)
5. Update `WompiPayment` record with transaction details
6. Update Medusa order metadata
7. Send admin notification email
8. Send customer notification email

### Status Mapping

| Wompi Status | Internal Status | Final? |
|-------------|----------------|--------|
| `PENDING` | `pending` | No |
| `APPROVED` | `approved` | Yes |
| `DECLINED` | `declined` | Yes |
| `VOIDED` | `voided` | Yes |
| `ERROR` | `error` | Yes |

## Admin Panel

### Wompi Dashboard (`/admin/wompi`)

- Table view of all payment records
- Filter by status: Pending, Approved, Declined, Voided, Error, All
- Copy payment link to clipboard
- Open payment link in new tab
- Shows payment manager email configuration

### Order Widget

Appears in the order detail sidebar. Shows:
- Payment status badge (color-coded)
- Amount
- Transaction ID
- Reference
- Payment method
- Customer info
- Dates (generated, finalized)
- Payment link with copy button
- "Generate new link" button (for new or failed payments)

## Email Notifications

### To Customer

| Email | When | Content |
|-------|------|---------|
| Payment link | Link generated | Amount, items, "Pagar ahora" CTA |
| Payment approved | Webhook: APPROVED | Green checkmark, amount, "Ver mi pedido" CTA |
| Payment declined | Webhook: DECLINED | Red X, amount, contact info, "Reintentar" CTA |
| Payment error | Webhook: ERROR | Warning icon, contact info |
| Payment voided | Webhook: VOIDED | Grey icon, refund notice |

### To Admin

| Email | When | Content |
|-------|------|---------|
| Payment status | Webhook: any final status | Status badge, transaction details table |

## Troubleshooting

### Payment link URL is empty

The Wompi API doesn't return a `permalink` field. The checkout URL is constructed as `https://checkout.wompi.co/l/{id}`. If the URL is empty, check that the API response contains `data.data.id`.

### Webhook not received

1. Check `WOMPI_EVENTS_SECRET` is configured correctly
2. Verify the webhook URL is set in the Wompi dashboard: `https://your-backend.com/hooks/wompi/events`
3. Check server logs for signature validation errors

### Duplicate payment links

The generate-link endpoint returns 409 if an active payment link already exists for the order (status: `link_generating`, `link_ready`, or `pending`). Failed/declined/voided payments allow generating a new link.
