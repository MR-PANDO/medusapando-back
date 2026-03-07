# Email Audit Module

Custom Medusa v2 module that tracks **every outgoing email** from the platform. All emails — whether sent by custom modules (Wompi, abandoned carts) or by Medusa's notification system (order confirmations, password resets, etc.) — are logged to the database with their delivery status.

## How ALL emails are captured

There are two email sending paths in the platform. Both are instrumented:

### Path 1: SMTP Notification Provider (Medusa system emails)

All emails that go through Medusa's `INotificationModuleService.createNotifications()` are routed to the **SMTP notification provider** (`src/modules/smtp-notification/service.ts`). This provider logs every email to the audit table automatically — no caller-side changes needed.

This covers: abandoned carts, order confirmations, password resets, user invitations, and any future Medusa notification templates.

### Path 2: Direct sendEmail() (Custom module emails)

Emails sent outside Medusa's notification system (e.g., Wompi payment links, payment status notifications) use the centralized `sendEmail()` utility from `src/utils/email-sender.ts`. Callers pass the optional `auditService` parameter.

This covers: payment-link, payment-status emails.

```
                   +--------------------------+
                   |    Email Audit Table      |
                   |   (email_audit module)    |
                   +-----------^--------------+
                               |
              +----------------+----------------+
              |                                 |
  SMTP Notification Provider          sendEmail() utility
  (Medusa system emails)              (Custom module emails)
              |                                 |
  createNotifications()              sendPaymentLinkEmail()
  - abandoned-cart                   sendPaymentStatusEmail()
  - order-confirmation               (any future direct email)
  - password-reset
  - customer-welcome
  - invite-user
  - order-shipped
  - order-canceled
  - order-refund
  - (any future template)
```

## Architecture

```
src/
  modules/email-audit/
    models/email-audit.ts    # Data model (model.define)
    service.ts               # EmailAuditModuleService (MedusaService)
    types/index.ts           # EmailStatus, EmailType, LogEmailInput
    index.ts                 # Module registration (emailAudit)
    migrations/              # DB migration
  modules/smtp-notification/
    service.ts               # SMTP provider — auto-logs ALL notification emails
    templates/
      shared.ts              # Shared email wrapper, brand colors, escapeHtml
      abandoned-cart.ts      # Abandoned cart reminder
      customer-welcome.ts    # New customer welcome
      password-reset.ts      # Password reset link
      order-placed.ts        # Order confirmation with items table
      order-canceled.ts      # Order cancellation notice
      order-shipped.ts       # Shipment notification with tracking
      invite-user.ts         # Admin user invitation
  subscribers/
    customer-created.ts      # customer.created → customer-welcome email
    password-reset.ts        # auth.password_reset → password-reset email
    order-placed.ts          # order.placed → order-placed email
    order-canceled.ts        # order.canceled → order-canceled email
    order-shipment-created.ts # shipment.created → order-shipped email
    invite-created.ts        # invite.created → invite-user email
  utils/
    email-sender.ts          # Centralized sendEmail() with audit logging
    wompi-email.ts           # Payment email templates (uses email-sender)
  api/admin/emails/route.ts  # Admin API endpoint
  admin/routes/emails/page.tsx  # Admin UI page
```

### Audit Flow

```
1. Record created as "queued"
2. Email sent via nodemailer
3. Record updated to "sent" (with sent_at) or "failed" (with error message)
```

Audit logging is **best-effort** — if logging fails, the email still sends.

## Database

Table: `email_audit`

| Column       | Type        | Description                                    |
|-------------|-------------|------------------------------------------------|
| id          | TEXT (PK)   | Auto-generated ID                              |
| to          | TEXT        | Recipient email                                |
| from        | TEXT        | Sender (SMTP_FROM)                             |
| subject     | TEXT        | Email subject line                             |
| email_type  | TEXT        | Template/type identifier (see table below)     |
| status      | TEXT        | `queued`, `sent`, `failed`                     |
| error       | TEXT (null) | Error message if failed                        |
| metadata    | JSONB (null)| Extra context (order ref, cart ID, etc.)       |
| sent_at     | TIMESTAMPTZ | When the email was actually sent               |
| created_at  | TIMESTAMPTZ | When the record was created                    |
| updated_at  | TIMESTAMPTZ | Last update                                    |
| deleted_at  | TIMESTAMPTZ | Soft delete                                    |

Indexes: `status`, `email_type`, `created_at`, `to`, `deleted_at`

## Email Types

### Custom module emails (via sendEmail utility)

| Type              | Sender                          | Description                          |
|-------------------|----------------------------------|--------------------------------------|
| `payment-link`    | Generate link route              | Payment link sent to customer        |
| `payment-status`  | Wompi webhook handler            | Payment status notification to admin |

### Medusa system emails (via SMTP notification provider + subscribers)

Each email requires three pieces: a **subscriber** (listens to event), a **template** (HTML), and a **case in the SMTP provider** (routes template to send).

| Type                  | Event                  | Subscriber                       | Description                          |
|-----------------------|------------------------|----------------------------------|--------------------------------------|
| `abandoned-cart`      | (scheduled job)        | workflow step                    | Cart reminder sent to customer       |
| `customer-welcome`    | `customer.created`     | `customer-created.ts`            | Welcome email to new customer        |
| `password-reset`      | `auth.password_reset`  | `password-reset.ts`              | Reset link sent to customer          |
| `order-placed`        | `order.placed`         | `order-placed.ts`                | Order confirmation with items        |
| `order-canceled`      | `order.canceled`       | `order-canceled.ts`              | Cancellation notice to customer      |
| `order-shipped`       | `shipment.created`     | `order-shipment-created.ts`      | Shipping notification with tracking  |
| `invite-user`         | `invite.created`       | `invite-created.ts`              | Invitation email to new admin user   |

> The `email_type` field stores the Medusa notification `template` name. Any new template added to the SMTP notification provider is automatically tracked — no changes to the audit module needed.

### Medusa v2 events available for future email types

| Event                       | When it fires                     |
|----------------------------|-----------------------------------|
| `order.completed`          | Order marked as completed         |
| `order.archived`           | Order archived                    |
| `order.return_requested`   | Customer requests a return        |
| `order.return_received`    | Return items received             |
| `order.claim_created`      | Claim created on order            |
| `order.exchange_created`   | Exchange created on order         |
| `payment.captured`         | Payment captured                  |
| `payment.refunded`         | Payment refunded                  |
| `invite.resent`            | Invite resent                     |
| `delivery.created`         | Delivery created                  |

## Setup

### 1. Register in medusa-config.ts

Already registered:
```ts
{
  resolve: "./src/modules/email-audit",
},
```

### 2. Run migration

```bash
npx medusa db:migrate
```

### 3. Environment variables

No new env vars required. Uses existing SMTP variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Admin UI

Accessible at `/admin/emails` (sidebar: "Correos").

### Features
- **Status filters**: Todos / En cola / Enviado / Fallido
- **Type filters**: Todos / Link de pago / Estado de pago / Carrito abandonado / Confirmacion pedido / Pedido enviado / Pedido cancelado / Reembolso / Contrasena / Bienvenida / Invitacion
- **Pagination** (25 per page)
- **Expandable rows** — click any row to see sender, error details, and metadata
- **Total count** displayed

## Admin API

### GET /admin/emails

List emails with optional filters.

**Query parameters:**
| Param      | Type   | Default | Description           |
|-----------|--------|---------|------------------------|
| status    | string | (all)   | Filter by status       |
| email_type| string | (all)   | Filter by email type   |
| to        | string | (all)   | Filter by recipient    |
| limit     | number | 50      | Page size              |
| offset    | number | 0       | Offset for pagination  |

**Response:**
```json
{
  "emails": [
    {
      "id": "emailaudit_01J...",
      "to": "customer@example.com",
      "from": "tienda@nutrimercados.com",
      "subject": "Tu link de pago - Pedido #1234",
      "email_type": "payment-link",
      "status": "sent",
      "error": null,
      "metadata": { "reference": "1234", "amountInCents": 2880000 },
      "sent_at": "2026-03-07T20:30:00.000Z",
      "created_at": "2026-03-07T20:29:59.000Z"
    }
  ],
  "count": 42
}
```

## Development

### Adding a new Medusa notification email (3 steps)

Every system email needs three pieces:

**Step 1: Create the template** in `src/modules/smtp-notification/templates/`:
```ts
// templates/order-refund.ts
import { emailWrapper, escapeHtml } from "./shared"

export function orderRefundSubject(data: any): string {
  return `Reembolso procesado - Pedido #${data.display_id}`
}
export function orderRefundTemplate(data: any): string {
  return emailWrapper(`<p>Tu reembolso ha sido procesado...</p>`)
}
```

**Step 2: Add the case** in `src/modules/smtp-notification/service.ts`:
```ts
import { orderRefundTemplate, orderRefundSubject } from "./templates/order-refund"
// ...
case "order-refund":
  subject = orderRefundSubject(templateData)
  html = orderRefundTemplate(templateData)
  break
```

**Step 3: Create the subscriber** in `src/subscribers/`:
```ts
// subscribers/payment-refunded.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"

export default async function paymentRefundedHandler({
  event: { data }, container,
}: SubscriberArgs<{ id: string }>) {
  // Fetch order, build data, send notification
  const notificationService = container.resolve(Modules.NOTIFICATION) as any
  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: "order-refund",
    data: { order_id: order.id, display_id: order.display_id },
  })
}

export const config: SubscriberConfig = { event: "payment.refunded" }
```

**Optional:** Add the label to admin UI in `src/admin/routes/emails/page.tsx` (TYPE_LABELS + filter button).

> Audit logging is automatic — the SMTP provider logs every email it sends. No extra code needed.
> All templates use the shared wrapper from `templates/shared.ts` for consistent branding.

### Adding a direct (non-notification) email

For emails sent outside Medusa's notification system:

1. Use `sendEmail()` from `src/utils/email-sender.ts`:
```ts
import { sendEmail } from "../utils/email-sender"
import type EmailAuditModuleService from "../modules/email-audit/service"

const emailAuditService = container.resolve<EmailAuditModuleService>("emailAudit")

await sendEmail(
  {
    to: "customer@example.com",
    subject: "Your receipt",
    html: "<h1>Thanks!</h1>",
    email_type: "receipt",
    metadata: { order_id: "order_123" },
  },
  emailAuditService
)
```

2. Add the type and label as described above.

### IMPORTANT: All new modules that send email MUST use one of these two paths

- **Medusa notifications**: add a template to the SMTP notification provider (automatically tracked)
- **Direct emails**: use `sendEmail()` from `src/utils/email-sender.ts` with the audit service

Never use `nodemailer` directly. This ensures 100% email tracking.

### Service methods

```ts
// Log a new email record
await emailAuditService.logEmail({
  to, from, subject, email_type, status,
  error?,    // string if failed
  metadata?, // any JSON-serializable data
  sent_at?,  // Date if already sent
})

// Update status
await emailAuditService.markSent(id)
await emailAuditService.markFailed(id, "SMTP timeout")

// Query with filters
const [emails, count] = await emailAuditService.listByFilters({
  status?: "sent",
  email_type?: "payment-link",
  to?: "user@example.com",
  limit?: 50,
  offset?: 0,
})
```

## File Reference

| File | Purpose |
|------|---------|
| **Email Audit Module** | |
| `src/modules/email-audit/models/email-audit.ts` | Medusa v2 data model |
| `src/modules/email-audit/service.ts` | Module service with CRUD + helper methods |
| `src/modules/email-audit/types/index.ts` | TypeScript types |
| `src/modules/email-audit/index.ts` | Module definition |
| `src/modules/email-audit/migrations/Migration20260307200000.ts` | Database migration |
| **SMTP Notification Provider** | |
| `src/modules/smtp-notification/service.ts` | SMTP provider — auto-logs ALL notification emails |
| `src/modules/smtp-notification/templates/shared.ts` | Shared email wrapper, branding, escapeHtml |
| `src/modules/smtp-notification/templates/abandoned-cart.ts` | Abandoned cart template |
| `src/modules/smtp-notification/templates/customer-welcome.ts` | Customer welcome template |
| `src/modules/smtp-notification/templates/password-reset.ts` | Password reset template |
| `src/modules/smtp-notification/templates/order-placed.ts` | Order confirmation template |
| `src/modules/smtp-notification/templates/order-canceled.ts` | Order canceled template |
| `src/modules/smtp-notification/templates/order-shipped.ts` | Shipment notification template |
| `src/modules/smtp-notification/templates/invite-user.ts` | Admin invite template |
| **Subscribers** | |
| `src/subscribers/customer-created.ts` | customer.created → customer-welcome |
| `src/subscribers/password-reset.ts` | auth.password_reset → password-reset |
| `src/subscribers/order-placed.ts` | order.placed → order-placed |
| `src/subscribers/order-canceled.ts` | order.canceled → order-canceled |
| `src/subscribers/order-shipment-created.ts` | shipment.created → order-shipped |
| `src/subscribers/invite-created.ts` | invite.created → invite-user |
| **Utilities** | |
| `src/utils/email-sender.ts` | Centralized email sending with audit |
| `src/utils/wompi-email.ts` | Wompi payment email templates |
| **Admin** | |
| `src/api/admin/emails/route.ts` | Admin API for listing emails |
| `src/admin/routes/emails/page.tsx` | Admin UI page |
