# Email Notification System

Complete documentation for the Vita Integral email notification system built on Medusa v2.

## Architecture Overview

```
Medusa Events (Redis Event Bus)
        |
   Subscribers (src/subscribers/)
        |
   notifyWithAudit() (src/utils/notify-with-audit.ts)
        |
   +--> Medusa Notification Module (SMTP provider)
   |        |
   |    SMTP Templates (src/modules/smtp-notification/templates/)
   |        |
   |    Nodemailer → SMTP server
   |
   +--> Email Audit Module (src/modules/email-audit/)
            |
        Logs to DB (email_audit table)
```

### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| SMTP Provider | `src/modules/smtp-notification/service.ts` | Medusa notification provider, renders templates and sends via SMTP |
| Email Templates | `src/modules/smtp-notification/templates/` | HTML email templates with Vita Integral branding |
| Shared Template | `src/modules/smtp-notification/templates/shared.ts` | Common wrapper, helpers, brand constants |
| Notify Helper | `src/utils/notify-with-audit.ts` | Sends notification + logs to audit |
| Email Sender | `src/utils/email-sender.ts` | Direct SMTP send (used by Wompi emails) |
| Wompi Emails | `src/utils/wompi-email.ts` | Payment link + status emails |
| Email Audit | `src/modules/email-audit/` | Tracks all sent/failed emails |
| SMTP Settings | `src/modules/email-audit/models/smtp-settings.ts` | DB-stored SMTP credentials |

## SMTP Configuration

SMTP credentials can be configured in two ways (DB takes priority):

### 1. Admin UI (recommended)

Navigate to **Settings > Emails** in the Medusa Admin. Fill in host, port, user, password, and from address. Click Save. Settings are stored in the `smtp_settings` table with 60-second cache.

### 2. Environment Variables (fallback)

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=user@example.com
SMTP_PASS=password
SMTP_FROM="Vita Integral <info@vitaintegral.co>"
```

### Logo Configuration

The email logo is loaded from the `EMAIL_LOGO_URL` env var. If not set, falls back to `https://nutrimercados.com/logo.png`.

**Recommended**: Upload `logo.png` to MinIO and set:
```env
EMAIL_LOGO_URL=https://storage.nutrimercados.com/vitaintegralimages/logo.png
```

Use the upload script:
```bash
cd .medusa/server
LOGO_PATH=/path/to/logo.png npx medusa exec ./src/scripts/upload-logo.js
```

## Email Templates

All templates use the shared wrapper (`shared.ts`) which provides:
- Vita Integral logo (180x50 PNG)
- Gradient accent line (green → orange → green)
- Consistent Inter font family
- Full footer (address, phone, email, social links)
- Preheader text for email client previews

### Brand Constants

| Constant | Value |
|----------|-------|
| `BRAND_GREEN` | `#5B8C3E` |
| `BRAND_ORANGE` | `#DA763E` |
| `STORE_NAME` | Vita Integral |
| `STORE_URL` | https://nutrimercados.com |
| `STORE_EMAIL` | info@vitaintegral.co |
| `STORE_PHONE` | 604 322 84 82 ext. 4 |
| `STORE_WHATSAPP` | +573122018760 |

### Shared Helpers

| Function | Description |
|----------|-------------|
| `emailWrapper(content, options?)` | Full HTML email with header, footer, logo |
| `ctaButton(href, label, color?)` | Centered call-to-action button |
| `sectionTitle(text)` | H2 heading |
| `paragraph(text, opts?)` | Styled paragraph (supports `muted`, `center`, `small`) |
| `divider()` | Horizontal rule |
| `infoBox(content)` | Grey rounded info box |
| `productThumbnail(src, alt)` | 96x96 product image |
| `formatCOP(amount)` | Colombian peso formatter |
| `escapeHtml(str)` | HTML entity escaping |

## Email Notifications

### Customer Emails

| Template | Event | File | Description |
|----------|-------|------|-------------|
| `customer-welcome` | `customer.created` | `templates/customer-welcome.ts` | Welcome email with feature list and CTA to explore products |
| `order-placed` | `order.placed` | `templates/order-placed.ts` | Order confirmation with item table, total, shipping address |
| `order-fulfillment` | `order.fulfillment_created` | `templates/order-fulfillment.ts` | Order prepared notification with item list and replacement highlighting |
| `order-shipped` | `shipment.created` | `templates/order-shipped.ts` | Shipping notification with tracking number and carrier info |
| `order-canceled` | `order.canceled` | `templates/order-canceled.ts` | Cancellation notice with contact info |
| `password-reset` | `auth.password_reset` | `templates/password-reset.ts` | Password reset link (1-hour expiry) |
| `payment-customer` | Wompi webhook | `templates/payment-customer.ts` | Payment approved/declined/error notification to customer |
| `abandoned-cart` | Scheduled workflow | `templates/abandoned-cart.ts` | 3-stage cart recovery (escalating urgency) |

### Admin/Internal Emails

| Template | Trigger | File | Description |
|----------|---------|------|-------------|
| `invite-user` | `invite.created` | `templates/invite-user.ts` | Admin panel invite |
| Payment status | Wompi webhook | `wompi-email.ts` | Payment details table sent to `WOMPI_PAYMENT_MANAGER_EMAIL` |
| Payment link | Admin action | `wompi-email.ts` | Generated payment link sent to customer |

### Wompi Payment Emails

Wompi emails are sent directly via `sendEmail()` (not through the notification module) because they originate from the webhook handler, not from Medusa events.

**Payment link** (`sendPaymentLinkEmail`):
- Sent to customer when admin generates a Wompi payment link
- Shows amount highlight, item list, "Pagar ahora" CTA
- Includes Wompi security badge

**Payment status to admin** (`sendPaymentStatusEmail`):
- Sent to `WOMPI_PAYMENT_MANAGER_EMAIL` on final payment status
- Shows color-coded status badge, transaction details table

**Payment status to customer** (`sendPaymentCustomerEmail`):
- Sent to customer on APPROVED, DECLINED, VOIDED, or ERROR
- Approved: green checkmark, "Ver mi pedido" CTA
- Declined/Error: warning icon, contact info box, orange "Reintentar" CTA

## Subscribers

| File | Event | Action |
|------|-------|--------|
| `customer-created.ts` | `customer.created` | Sends welcome email |
| `order-placed.ts` | `order.placed` | Sends order confirmation with items |
| `order-fulfillment-created.ts` | `order.fulfillment_created` | Sends fulfillment notification (with replacement detection) |
| `order-shipment-created.ts` | `shipment.created` | Sends shipping notification with tracking |
| `order-canceled.ts` | `order.canceled` | Sends cancellation notice |
| `password-reset.ts` | `auth.password_reset` | Sends password reset link |
| `invite-created.ts` | `invite.created` | Sends admin invite |

## Fulfillment & Replacements

The `order-fulfillment-created` subscriber detects product replacements via item metadata:

```typescript
// When creating fulfillment items, set metadata for replacements:
item.metadata = {
  is_replacement: true,
  original_title: "Original Product Name"
}

// Or set at order level:
order.metadata = {
  has_replacements: true,
  fulfillment_note: "Some products were replaced"
}
```

In the email, replacement items are highlighted with:
- Yellow background row
- Orange "Reemplazo de: {original product}" label

## Email Audit

All emails are logged in the `email_audit` table with status tracking:

| Status | Description |
|--------|-------------|
| `queued` | Email queued for sending |
| `sent` | Successfully delivered to SMTP server |
| `failed` | SMTP delivery failed (error message stored) |

### Admin Panel

Navigate to **Emails** in the Medusa Admin sidebar to:
- View all sent/failed emails with status, recipient, type, and timestamps
- Configure SMTP settings (host, port, user, password, from)
- Filter by status

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/emails` | List audit records (query: `status`, `limit`, `offset`) |
| GET | `/admin/emails/settings` | Get SMTP settings (password masked) |
| POST | `/admin/emails/settings` | Create/update SMTP settings |

## Abandoned Cart Emails

Handled by the workflow at `src/workflows/steps/send-abandoned-notifications.ts`.

Three reminder stages with escalating urgency:

| Reminder | Subject | CTA Color | Icon |
|----------|---------|-----------|------|
| 1st | "Tu carrito te espera" | Green | Cart |
| 2nd | "Tus productos saludables te esperan" | Green | Clock |
| 3rd | "Ultima oportunidad" | Orange | Warning |

## Wompi Integration

### Environment Variables

```env
WOMPI_PRIVATE_KEY=prv_...
WOMPI_ENVIRONMENT=production    # or sandbox
WOMPI_EVENTS_SECRET=...         # webhook signature validation
WOMPI_PAYMENT_MANAGER_EMAIL=admin@vitaintegral.co
WOMPI_EMAIL_NOTIFICATIONS=true  # set to "false" to disable
```

### Webhook Flow

1. Wompi sends `transaction.updated` to `/hooks/wompi/events`
2. Signature validated with `WOMPI_EVENTS_SECRET`
3. `WompiPayment` record updated in DB
4. Order metadata updated
5. Admin email sent (payment status details)
6. Customer email sent (payment approved/declined)

### Admin Panel

- **Wompi page** (`/admin/wompi`): List all payments, filter by status, copy payment links
- **Order widget** (`order.details.side.after`): Shows Wompi payment status, generate new payment link

## Diagnostic Script

Test the entire email pipeline:

```bash
cd .medusa/server
npx medusa exec ./src/scripts/email-diagnostic.js
```

Tests:
1. SMTP settings source (DB vs env vars)
2. Sends a test email
3. Lists recent audit records

## Image Sizes

All email images use both HTML attributes and inline CSS for cross-client compatibility:

| Image | Size | Notes |
|-------|------|-------|
| Logo | 180x50px | PNG format (SVG not supported by most email clients) |
| Product thumbnails | 96x96px | `object-fit: cover`, rounded corners |
