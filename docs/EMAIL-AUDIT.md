# Email Audit Module

Custom Medusa v2 module that tracks all outgoing emails from the store. Every email sent (payment links, payment status notifications, abandoned cart reminders) is logged to the database with its delivery status.

## Architecture

```
src/
  modules/email-audit/
    models/email-audit.ts    # Data model (model.define)
    service.ts               # EmailAuditModuleService (MedusaService)
    types/index.ts           # EmailStatus, EmailType, LogEmailInput
    index.ts                 # Module registration (emailAudit)
    migrations/              # DB migration
  utils/
    email-sender.ts          # Centralized sendEmail() with audit logging
    wompi-email.ts           # Payment email templates (uses email-sender)
  api/admin/emails/route.ts  # Admin API endpoint
  admin/routes/emails/page.tsx  # Admin UI page
```

### Flow

```
Caller (route/workflow)
  -> sendEmail(params, auditService?)
     1. Logs record as "queued"
     2. Sends via nodemailer
     3. Marks as "sent" or "failed" (with error message)
```

Audit logging is **best-effort** — if logging fails, the email still sends. The `auditService` parameter is optional for backward compatibility.

## Database

Table: `email_audit`

| Column       | Type        | Description                                    |
|-------------|-------------|------------------------------------------------|
| id          | TEXT (PK)   | Auto-generated ID                              |
| to          | TEXT        | Recipient email                                |
| from        | TEXT        | Sender (SMTP_FROM)                             |
| subject     | TEXT        | Email subject line                             |
| email_type  | TEXT        | `payment-link`, `payment-status`, `abandoned-cart` |
| status      | TEXT        | `queued`, `sent`, `failed`                     |
| error       | TEXT (null) | Error message if failed                        |
| metadata    | JSONB (null)| Extra context (order ref, cart ID, etc.)       |
| sent_at     | TIMESTAMPTZ | When the email was actually sent               |
| created_at  | TIMESTAMPTZ | When the record was created                    |
| updated_at  | TIMESTAMPTZ | Last update                                    |
| deleted_at  | TIMESTAMPTZ | Soft delete                                    |

Indexes: `status`, `email_type`, `created_at`, `to`, `deleted_at`

## Email Types

| Type              | Sender                          | Description                          |
|-------------------|----------------------------------|--------------------------------------|
| `payment-link`    | Generate link route              | Payment link sent to customer        |
| `payment-status`  | Wompi webhook handler            | Payment status notification to admin |
| `abandoned-cart`  | Abandoned cart workflow step      | Cart reminder sent to customer       |

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
- **Filters** by status (En cola / Enviado / Fallido) and type (Link de pago / Estado de pago / Carrito abandonado)
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

### Adding a new email type

1. Add the type to `src/modules/email-audit/types/index.ts`:
```ts
export type EmailType =
  | "abandoned-cart"
  | "payment-link"
  | "payment-status"
  | "order-confirmation"  // new
  | string
```

2. Create or update the email template function.

3. Use `sendEmail()` from `src/utils/email-sender.ts`:
```ts
import { sendEmail } from "../utils/email-sender"
import type EmailAuditModuleService from "../modules/email-audit/service"

// Resolve the service from container
const emailAuditService = container.resolve<EmailAuditModuleService>("emailAudit")

await sendEmail(
  {
    to: "customer@example.com",
    subject: "Order confirmed",
    html: "<h1>Thanks!</h1>",
    email_type: "order-confirmation",
    metadata: { order_id: "order_123" },
  },
  emailAuditService
)
```

4. Add the label to the admin UI in `src/admin/routes/emails/page.tsx`:
```ts
const TYPE_LABELS: Record<string, string> = {
  "order-confirmation": "Confirmacion de pedido",
  // ...existing
}
```
And add a `<Select.Item>` in the type filter.

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
| `src/utils/email-sender.ts` | Centralized email sending with audit |
| `src/utils/wompi-email.ts` | Wompi payment email templates |
| `src/api/admin/emails/route.ts` | Admin API for listing emails |
| `src/admin/routes/emails/page.tsx` | Admin UI page |
| `src/workflows/steps/send-abandoned-notifications.ts` | Abandoned cart step (logs to audit) |
