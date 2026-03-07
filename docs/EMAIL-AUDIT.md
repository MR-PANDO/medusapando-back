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

### Medusa system emails (via SMTP notification provider)

| Type                  | Trigger                            | Description                          |
|-----------------------|------------------------------------|--------------------------------------|
| `abandoned-cart`      | Abandoned cart job/workflow         | Cart reminder sent to customer       |
| `order-confirmation`  | Order placed                       | Order confirmation to customer       |
| `order-shipped`       | Order fulfillment created          | Shipping notification to customer    |
| `order-canceled`      | Order canceled                     | Cancellation notice to customer      |
| `order-refund`        | Refund processed                   | Refund notification to customer      |
| `customer-welcome`    | Customer account created           | Welcome email to new customer        |
| `password-reset`      | Password reset requested           | Reset link sent to customer          |
| `invite-user`         | Admin user invited                 | Invitation email to new admin user   |

> The `email_type` field stores the Medusa notification `template` name. Any new template added to the SMTP notification provider is automatically tracked — no changes to the audit module needed.

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

### Adding a new Medusa notification template

When adding a new template to the SMTP notification provider, it is **automatically tracked** by the audit module. Just:

1. Add the template case in `src/modules/smtp-notification/service.ts`:
```ts
case "order-confirmation":
  subject = "Tu pedido ha sido confirmado"
  html = orderConfirmationTemplate(data)
  break
```

2. (Optional) Add the type to `src/modules/email-audit/types/index.ts` for documentation:
```ts
export type EmailType =
  | "order-confirmation"  // new
  | ...
```

3. Add the label to the admin UI in `src/admin/routes/emails/page.tsx`:
```ts
const TYPE_LABELS: Record<string, string> = {
  "order-confirmation": "Confirmacion de pedido",
}
```
And add a button entry in the type filter array.

> The audit module uses the notification `template` name as the `email_type`. Unknown types still display in the UI — they just show the raw type string.

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
| `src/modules/email-audit/models/email-audit.ts` | Medusa v2 data model |
| `src/modules/email-audit/service.ts` | Module service with CRUD + helper methods |
| `src/modules/email-audit/types/index.ts` | TypeScript types |
| `src/modules/email-audit/index.ts` | Module definition |
| `src/modules/email-audit/migrations/Migration20260307200000.ts` | Database migration |
| `src/modules/smtp-notification/service.ts` | SMTP provider — auto-logs ALL notification emails |
| `src/utils/email-sender.ts` | Centralized email sending with audit |
| `src/utils/wompi-email.ts` | Wompi payment email templates |
| `src/api/admin/emails/route.ts` | Admin API for listing emails |
| `src/admin/routes/emails/page.tsx` | Admin UI page |
