# Wompi Payment Integration — Technical Documentation

> **Stack:** MedusaJS v2 (2.12.1) · TypeScript · PostgreSQL · Node.js
> **Status:** Implemented March 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Environment Variables](#environment-variables)
5. [Database](#database)
6. [Payment Provider](#payment-provider)
7. [Wompi Module (Custom)](#wompi-module-custom)
8. [API Routes](#api-routes)
9. [Webhook Handler](#webhook-handler)
10. [Signature Validation](#signature-validation)
11. [Email Notifications](#email-notifications)
12. [Admin UI](#admin-ui)
13. [Order Status Flow](#order-status-flow)
14. [medusa-config.ts Registration](#medusa-configts-registration)
15. [Wompi API Reference](#wompi-api-reference)
16. [Testing](#testing)
17. [Troubleshooting](#troubleshooting)

---

## Overview

This integration adds Wompi (Colombian payment gateway) to the MedusaJS v2 backend. The flow is admin-initiated: an admin generates a payment link for an order, the link is emailed to the customer, and when the customer pays, Wompi sends a webhook to update the order status.

### Payment Flow

```
Admin generates link (POST /admin/wompi/generate-link)
    |
    v
Backend calls POST /v1/payment_links (Wompi API)
    |
    v
Payment link stored in wompi_payment table
    |
    v
Customer receives branded email with "Pagar ahora" button
    |
    v
Customer pays via Wompi checkout page
    |
    v
Wompi POSTs to /hooks/wompi/events (webhook)
    |
    v
Signature validated (SHA-256 + timing-safe comparison)
    |
    v
Order metadata updated:
  APPROVED  -> "payment_approved"
  DECLINED  -> "payment_declined"
  VOIDED    -> "payment_voided"
  ERROR     -> "payment_error"
    |
    v
Email notification sent to Payment Manager
```

---

## Architecture

### Two Components

1. **Payment Provider** (`src/providers/payment-wompi/`) — Extends `AbstractPaymentProvider` from Medusa v2. Handles the Medusa payment lifecycle methods and Wompi API communication.

2. **Wompi Module** (`src/modules/wompi/`) — Custom Medusa module with its own database table (`wompi_payment`) for tracking payment links, transaction IDs, statuses, and webhook payloads.

### Why Two Components?

- The **payment provider** satisfies Medusa's payment interface (initiate, authorize, capture, refund, etc.)
- The **custom module** provides the `wompi_payment` table for tracking Wompi-specific data that doesn't fit in Medusa's payment session model (payment link IDs, checkout URLs, webhook audit log)

---

## File Structure

```
src/
├── modules/
│   └── wompi/
│       ├── index.ts                          # Module definition (WOMPI_MODULE = "wompi")
│       ├── service.ts                        # WompiModuleService (CRUD + business logic)
│       ├── models/
│       │   └── wompi-payment.ts              # WompiPayment entity definition
│       ├── migrations/
│       │   └── Migration20260307120000.ts    # Database migration
│       └── types/
│           └── index.ts                      # TypeScript types & status constants
│
├── providers/
│   └── payment-wompi/
│       ├── index.ts                          # ModuleProvider registration
│       └── service.ts                        # WompiPaymentProviderService
│
├── api/
│   ├── hooks/
│   │   └── wompi/
│   │       └── events/
│   │           └── route.ts                  # POST /hooks/wompi/events (public webhook)
│   └── admin/
│       └── wompi/
│           ├── route.ts                      # GET /admin/wompi (list payments)
│           ├── [id]/
│           │   └── route.ts                  # GET /admin/wompi/:id (single payment)
│           ├── generate-link/
│           │   └── route.ts                  # POST /admin/wompi/generate-link
│           └── settings/
│               └── route.ts                  # GET /admin/wompi/settings
│
├── admin/
│   └── routes/
│       └── wompi/
│           └── page.tsx                      # Admin UI dashboard
│
└── utils/
    ├── wompi-signature.ts                    # SHA-256 signature validation
    └── wompi-email.ts                        # Email templates (payment link + status)
```

---

## Environment Variables

### Wompi-Specific Variables

| Variable | Where to Get It | Example |
|---|---|---|
| `WOMPI_PUBLIC_KEY` | Wompi Dashboard > Developers > API Keys | `pub_prod_xxxxxxxxxxxxxxxxxxxxxx` |
| `WOMPI_PRIVATE_KEY` | Wompi Dashboard > Developers > API Keys | `prv_prod_xxxxxxxxxxxxxxxxxxxxxx` |
| `WOMPI_EVENTS_SECRET` | Wompi Dashboard > Developers > Transaction Tracking | `events_xxxxxxxxxxxxxxxxxxxxxx` |
| `WOMPI_ENVIRONMENT` | Your choice: `sandbox` or `production` | `production` |
| `WOMPI_PAYMENT_MANAGER_EMAIL` | Admin email for payment notifications | `payments@yourstore.com` |
| `WOMPI_EMAIL_NOTIFICATIONS` | (Optional) Set `false` to disable emails | `true` (default) |

### Coolify Deployment — Which Service Gets Which Vars

The project runs two Coolify services from the same codebase, differentiated by `WORKER_MODE`:

- **medusa-server** (`WORKER_MODE=server`, `DISABLE_ADMIN=false`) — Handles HTTP: admin panel, API routes, webhook endpoint
- **medusa-worker** (`WORKER_MODE=worker`, `DISABLE_ADMIN=true`) — Runs cron jobs (abandoned carts, cleanup) and event subscribers

**Both services must have all 5 Wompi variables.** The worker loads `medusa-config.ts` at startup, which registers the payment provider and runs `validateOptions()`. If the keys are missing, the worker crashes at boot.

#### Server env vars (add these 5 to your existing server config):

```env
WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_EVENTS_SECRET=your_webhook_event_secret
WOMPI_ENVIRONMENT=production
WOMPI_PAYMENT_MANAGER_EMAIL=payments@yourstore.com
```

#### Worker env vars (add the same 5 to your existing worker config):

```env
WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_EVENTS_SECRET=your_webhook_event_secret
WOMPI_ENVIRONMENT=production
WOMPI_PAYMENT_MANAGER_EMAIL=payments@yourstore.com
```

> **Important:** In Coolify, set these as **Build Variables** (not just runtime env vars) due to [Coolify issue #1930](https://github.com/coollabsio/coolify/issues/1930). This ensures they're available during `medusa build`.

### Dependencies on Existing Variables

These variables must already be configured (they're used by the Wompi integration too):

| Variable | Used For |
|---|---|
| `STOREFRONT_URL` | Redirect URL after payment (`{STOREFRONT_URL}/order/confirmed`) |
| `SMTP_HOST` | Sending payment link + status emails |
| `SMTP_PORT` | SMTP connection |
| `SMTP_USER` | SMTP authentication |
| `SMTP_PASS` | SMTP authentication |
| `SMTP_FROM` | Email "from" address |
| `SMTP_SECURE` | TLS setting |

### Wompi API Base URLs

| Environment | URL | Key Prefix |
|---|---|---|
| Sandbox | `https://sandbox.wompi.co/v1` | `pub_test_` / `prv_test_` |
| Production | `https://production.wompi.co/v1` | `pub_prod_` / `prv_prod_` |

Selected automatically based on `WOMPI_ENVIRONMENT`.

### Quick Copy-Paste for Coolify

**For initial testing (sandbox):**

```env
WOMPI_PUBLIC_KEY=pub_test_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_test_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_EVENTS_SECRET=test_events_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_ENVIRONMENT=sandbox
WOMPI_PAYMENT_MANAGER_EMAIL=payments@yourstore.com
```

**For production:**

```env
WOMPI_PUBLIC_KEY=pub_prod_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_PRIVATE_KEY=prv_prod_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_EVENTS_SECRET=prod_events_xxxxxxxxxxxxxxxxxxxxxx
WOMPI_ENVIRONMENT=production
WOMPI_PAYMENT_MANAGER_EMAIL=payments@yourstore.com
```

---

## Database

### wompi_payment Table

| Column | Type | Description |
|---|---|---|
| `id` | TEXT PK | Medusa-generated UUID |
| `order_id` | TEXT | Medusa order ID |
| `reference` | TEXT | Order display_id (sent to Wompi as reference) |
| `wompi_payment_link_id` | TEXT NULL | Wompi payment link ID |
| `wompi_transaction_id` | TEXT NULL | Wompi transaction ID (set after payment) |
| `wompi_checkout_url` | TEXT NULL | Wompi checkout URL for customer |
| `wompi_status` | TEXT | Internal status (see below) |
| `amount_in_cents` | INTEGER | Amount in COP centavos |
| `currency` | TEXT | Default "COP" |
| `payment_method_type` | TEXT NULL | e.g. "CARD", "PSE", "NEQUI" |
| `customer_email` | TEXT NULL | Customer email |
| `link_generated_at` | TIMESTAMPTZ NULL | When link was created |
| `finalized_at` | TIMESTAMPTZ NULL | When payment reached final status |
| `last_webhook_payload` | JSONB NULL | Full webhook body for audit |
| `created_at` | TIMESTAMPTZ | Auto |
| `updated_at` | TIMESTAMPTZ | Auto |
| `deleted_at` | TIMESTAMPTZ NULL | Soft delete |

### Indexes

- `IDX_wompi_payment_link_id` — Fast webhook lookups by payment_link_id
- `IDX_wompi_payment_order_id` — Fast order lookups
- `IDX_wompi_payment_status` — Admin panel filter queries
- `IDX_wompi_payment_deleted_at` — Soft delete filtering

### Running the Migration

```bash
npx medusa db:migrate
```

---

## Payment Provider

**File:** `src/providers/payment-wompi/service.ts`

Extends `AbstractPaymentProvider<WompiProviderOptions>` with:

### Custom Methods (Wompi-specific)

| Method | Purpose |
|---|---|
| `createPaymentLink(params)` | Calls `POST /v1/payment_links` on Wompi API |
| `getTransactionStatus(transactionId)` | Calls `GET /v1/transactions/:id` |
| `validateWebhookSignature(payload)` | SHA-256 signature validation |

### Medusa Lifecycle Methods

| Method | Behavior |
|---|---|
| `initiatePayment` | Returns session data (link created later via admin route) |
| `authorizePayment` | Returns authorized status |
| `capturePayment` | Pass-through (Wompi handles capture) |
| `refundPayment` | Calls Wompi void endpoint for card transactions |
| `cancelPayment` | Pass-through |
| `deletePayment` | Pass-through |
| `getPaymentStatus` | Returns pending (status tracked via webhooks) |
| `getWebhookActionAndData` | Maps Wompi statuses to Medusa payment actions |

### Configuration Validation

`validateOptions()` runs at startup and ensures all required options are present.

### Provider ID

Once registered, the provider ID is: `pp_wompi_wompi`

---

## Wompi Module (Custom)

**File:** `src/modules/wompi/service.ts`

### Service Methods

| Method | Purpose |
|---|---|
| `listWompiPayments(filters)` | List payments (auto-generated by MedusaService) |
| `retrieveWompiPayment(id)` | Get single payment by ID |
| `createWompiPayments(data)` | Create payment record |
| `updateWompiPayments(data)` | Update payment record |
| `getPendingPayments()` | List payments in link_generating/link_ready/pending status |
| `getAllPayments(filters?)` | List all payments with optional status filter |
| `findByPaymentLinkId(id)` | Find payment by Wompi payment link ID (webhook lookup) |
| `findByOrderId(id)` | Find payment by Medusa order ID |
| `createPaymentRecord(data)` | Create a new payment record with link details |
| `updateFromWebhook(...)` | Update payment from webhook data (idempotent) |
| `getSettings()` | Get payment manager email and notification config |

---

## API Routes

### Admin Routes (authenticated)

#### `GET /admin/wompi`

List payments with optional filters.

**Query params:**
- `pending_only=true` — Only pending payments
- `status=approved` — Filter by specific status

**Response:** `{ wompi_payments: [...], count: number }`

#### `GET /admin/wompi/:id`

Get a single payment record.

**Response:** `{ wompi_payment: {...} }`

#### `POST /admin/wompi/generate-link`

Generate a Wompi payment link for an order and email it to the customer.

**Body:** `{ order_id: string }`

**What it does:**
1. Validates order exists and has a positive total
2. Checks no active link already exists (409 if it does)
3. Creates payment link via Wompi API
4. Saves payment record to `wompi_payment` table
5. Updates order metadata with link details
6. Sends branded email to customer with "Pagar ahora" button

**Response:** `{ wompi_payment: {...} }`

**Error codes:**
- `400` — Missing order_id or order total <= 0
- `404` — Order not found
- `409` — Payment link already exists for this order
- `500` — Wompi API error or provider not configured

#### `GET /admin/wompi/settings`

Get current payment manager settings.

**Response:** `{ settings: { paymentManagerEmail, emailNotificationsEnabled } }`

### Webhook Route (public)

#### `POST /hooks/wompi/events`

Receives webhook events from Wompi. See [Webhook Handler](#webhook-handler).

**Important:** This route has `AUTHENTICATE = false` — it's the only public route.

---

## Webhook Handler

**File:** `src/api/hooks/wompi/events/route.ts`

### Processing Steps

1. **Validate payload structure** — Check required fields exist
2. **Validate signature** — SHA-256 with timing-safe comparison (rejects with 401)
3. **Filter events** — Only processes `transaction.updated`
4. **Idempotency check** — Skips if same transaction+status already processed
5. **Update wompi_payment record** — Status, transaction ID, webhook payload
6. **Update Medusa order metadata** — `wompi_status`, `wompi_transaction_id`, `wompi_finalized_at`
7. **Send email notification** — To payment manager (if enabled)

### Security

- `AUTHENTICATE = false` — Required because Wompi sends webhooks without auth tokens
- SHA-256 signature validation on every request
- `crypto.timingSafeEqual` — Prevents timing attacks on checksum comparison
- Idempotent — Safe to receive duplicate webhooks
- Generic error messages — No internal details leaked in responses

---

## Signature Validation

**File:** `src/utils/wompi-signature.ts`

### Algorithm (per Wompi docs)

```
checksum = SHA256(
  value_of_property_1 +
  value_of_property_2 +
  ... (dynamic, from signature.properties array) +
  timestamp +
  events_secret
)
```

### Important Security Notes

1. **Never hardcode the properties array** — Read `signature.properties` from each webhook payload dynamically. Wompi may change which properties are included.

2. **Timing-safe comparison** — Uses `crypto.timingSafeEqual` to prevent timing attacks that could leak the expected checksum byte-by-byte.

3. **Property resolution** — Supports nested paths like `"transaction.id"` which resolves to `payload.data.transaction.id`.

---

## Email Notifications

**File:** `src/utils/wompi-email.ts`

### Two Email Types

#### 1. Payment Link Email (to customer)

**Trigger:** When admin generates a payment link via `POST /admin/wompi/generate-link`

**Content:**
- Store header with NutriMercados branding (green #2d6a4f)
- Greeting with customer name
- Order reference and total amount
- Product list with thumbnails, quantities, prices
- Large "Pagar ahora" CTA button linking to Wompi checkout
- Store footer

**Subject:** `Tu link de pago - Pedido #REF | NutriMercados`

#### 2. Payment Status Email (to payment manager)

**Trigger:** When webhook receives a final status (APPROVED/DECLINED/VOIDED/ERROR)

**Content:**
- Store header with NutriMercados branding
- Status badge (color-coded: green/red/grey/orange)
- Order ID, transaction ID, amount, payment method, customer email, timestamp

**Subject:** `Pago APROBADO - Pedido ORDER_ID | NutriMercados`

### Branding Constants

- `BRAND_COLOR`: `#2d6a4f` (matches abandoned cart emails)
- `STORE_NAME`: `NutriMercados`
- All user-provided content is HTML-escaped to prevent XSS

---

## Admin UI

**File:** `src/admin/routes/wompi/page.tsx`

### Features

- **Payment Manager Settings** — Configure notification email address
- **Filter buttons** — Pending, Approved, Declined, Voided, Error, All
- **Payments table** — Reference, customer, amount, method, status, dates, checkout link
- **Status badges** — Color-coded (green/blue/orange/red/grey)
- **Refresh button** — Manual data refresh

### Route

Accessible at `/a/wompi` in the Medusa Admin dashboard. Appears in the sidebar with a credit card icon.

---

## Order Status Flow

### Status Constants

```typescript
// Stored in order.metadata.wompi_status
GENERATE_WOMPI     = "generate_wompi"       // Initial trigger
LINK_GENERATING    = "link_generating"      // API call in progress
LINK_READY         = "wompi_link_ready"     // Link created, waiting for customer
LINK_ERROR         = "wompi_link_error"     // Link creation failed
PENDING            = "wompi_pending"        // Customer started payment
PAYMENT_APPROVED   = "payment_approved"     // Payment successful
PAYMENT_DECLINED   = "payment_declined"     // Payment rejected
PAYMENT_VOIDED     = "payment_voided"       // Payment reversed
PAYMENT_ERROR      = "payment_error"        // Payment error
```

### State Machine

```
generate_wompi
    |
    v
link_generating
    |
    +---> wompi_link_error (Wompi API failure)
    |
    v
wompi_link_ready
    |
    v (customer pays via Wompi)
wompi_pending
    |
    +---> payment_approved  (APPROVED)
    +---> payment_declined  (DECLINED)
    +---> payment_voided    (VOIDED)
    +---> payment_error     (ERROR)
```

---

## medusa-config.ts Registration

Two entries are added to the `modules` array:

```typescript
// 1. Custom module for wompi_payment table
{
  resolve: "./src/modules/wompi",
},

// 2. Payment provider
{
  resolve: "@medusajs/medusa/payment",
  options: {
    providers: [
      {
        resolve: "./src/providers/payment-wompi",
        id: "wompi",
        options: {
          publicKey: process.env.WOMPI_PUBLIC_KEY,
          privateKey: process.env.WOMPI_PRIVATE_KEY,
          eventsSecret: process.env.WOMPI_EVENTS_SECRET,
          environment: process.env.WOMPI_ENVIRONMENT ?? "sandbox",
        },
      },
    ],
  },
},
```

After registration, enable the Wompi provider for your region in the Medusa Admin:
**Settings > Regions > Colombia > Payment Providers > Enable Wompi**

---

## Wompi API Reference

### Create Payment Link

```
POST https://{sandbox|production}.wompi.co/v1/payment_links
Authorization: Bearer {PRIVATE_KEY}
Content-Type: application/json
```

```json
{
  "name": "Order #123",
  "description": "Payment for order #123",
  "single_use": true,
  "collect_shipping": false,
  "currency": "COP",
  "amount_in_cents": 9500000,
  "redirect_url": "https://yourstore.com/order/confirmed",
  "customer_data": {
    "email": "customer@email.com",
    "full_name": "Customer Name"
  },
  "expires_at": "2026-12-31T23:59:59.000Z"
}
```

**Response:** `{ data: { id: "link_id", permalink: "https://checkout.wompi.co/l/xxxxx" } }`

### Get Transaction

```
GET https://{sandbox|production}.wompi.co/v1/transactions/{transaction_id}
Authorization: Bearer {PUBLIC_KEY}
```

### Void Transaction (Refund)

```
POST https://{sandbox|production}.wompi.co/v1/transactions/{transaction_id}/void
Authorization: Bearer {PRIVATE_KEY}
```

### Webhook Payload — transaction.updated

```json
{
  "event": "transaction.updated",
  "data": {
    "transaction": {
      "id": "01-1532941443-49201",
      "amount_in_cents": 4490000,
      "reference": "ORDER_DISPLAY_ID",
      "customer_email": "john@email.com",
      "currency": "COP",
      "payment_method_type": "CARD",
      "status": "APPROVED",
      "payment_link_id": "link_id"
    }
  },
  "signature": {
    "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    "checksum": "sha256hashvalue"
  },
  "timestamp": 1530291411,
  "sent_at": "2018-07-20T16:45:05.000Z"
}
```

### Transaction Statuses

| Wompi Status | Meaning | Final? |
|---|---|---|
| `PENDING` | Being processed | No |
| `APPROVED` | Payment successful | Yes |
| `DECLINED` | Payment rejected | Yes |
| `VOIDED` | Payment reversed | Yes |
| `ERROR` | Internal error | Yes |

---

## Testing

### Sandbox Setup

1. Set `WOMPI_ENVIRONMENT=sandbox` in your env
2. Use sandbox keys from Wompi Dashboard (prefix: `pub_test_` / `prv_test_`)
3. Register webhook URL: `https://your-backend.com/hooks/wompi/events`

### Test Cards

| Card Number | Result |
|---|---|
| `4242 4242 4242 4242` | APPROVED |
| `4111 1111 1111 1111` | DECLINED |

Use any future expiration date and any 3-digit CVC.

### Test Scenarios

| Scenario | How to Test | Expected |
|---|---|---|
| Generate link | `POST /admin/wompi/generate-link { order_id }` | 201, payment record created, customer email sent |
| Duplicate link | Same POST again | 409 with existing payment |
| Approved payment | Pay with 4242... card | Webhook fires, status -> payment_approved, manager email sent |
| Declined payment | Pay with 4111... card | Webhook fires, status -> payment_declined, manager email sent |
| Invalid webhook | POST to webhook with wrong checksum | 401 response |
| Admin panel | Visit /a/wompi | Shows payments list with correct statuses |

### Webhook Testing with cURL

```bash
# This will be REJECTED (invalid signature) — use for testing the rejection path
curl -X POST https://your-backend.com/hooks/wompi/events \
  -H "Content-Type: application/json" \
  -d '{
    "event": "transaction.updated",
    "data": {
      "transaction": {
        "id": "test-123",
        "amount_in_cents": 100000,
        "reference": "ORDER_ID",
        "customer_email": "test@test.com",
        "currency": "COP",
        "payment_method_type": "CARD",
        "status": "APPROVED",
        "payment_link_id": "link-123"
      }
    },
    "signature": {
      "properties": ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
      "checksum": "invalid_checksum_for_testing"
    },
    "timestamp": 1234567890
  }'
```

---

## Troubleshooting

### Common Issues

**"Wompi payment provider not configured"**
- Check that `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, and `WOMPI_EVENTS_SECRET` are set
- Ensure the payment provider is registered in `medusa-config.ts`
- Run `npx medusa db:migrate` after adding the module

**Webhook returns 401**
- Verify `WOMPI_EVENTS_SECRET` matches the secret in Wompi Dashboard
- The events secret is found at: Dashboard > Developers > Transaction Tracking

**Customer not receiving email**
- Check SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- Check server logs for `[Wompi] Payment link email failed` messages
- Email sending is non-blocking — link generation succeeds even if email fails

**Duplicate webhooks**
- The handler is idempotent — it checks if the same transaction+status was already processed
- Duplicate webhooks will return 200 without updating the database again

### Log Messages

All Wompi-related logs use these prefixes:
- `[Wompi]` — General operations
- `[Wompi Webhook]` — Webhook handler
- Look for these in your server logs for debugging

### Key File Locations Quick Reference

| What | Path |
|---|---|
| Provider config options | `medusa-config.ts` (search for "payment-wompi") |
| Payment provider service | `src/providers/payment-wompi/service.ts` |
| Module service | `src/modules/wompi/service.ts` |
| Webhook handler | `src/api/hooks/wompi/events/route.ts` |
| Email templates | `src/utils/wompi-email.ts` |
| Signature validation | `src/utils/wompi-signature.ts` |
| Admin UI | `src/admin/routes/wompi/page.tsx` |
| Type definitions | `src/modules/wompi/types/index.ts` |
| Database migration | `src/modules/wompi/migrations/Migration20260307120000.ts` |
