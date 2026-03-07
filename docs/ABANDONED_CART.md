# Abandoned Cart Recovery Module

Automated 3-email drip campaign for abandoned carts, plus a customer-facing section in the account dashboard to recover their cart.

## How It Works

A scheduled job runs daily at midnight, finds incomplete carts with items, and sends up to 3 recovery emails over a week. Customers can also see their most recent abandoned cart in their account overview page and recover it with one click.

## Drip Schedule

| Email | Timing | Subject (ES) |
|-------|--------|--------------|
| 1 | 24h after last cart update | "Tu carrito te espera en NutriMercados" |
| 2 | 72h (3 days) after email 1 | "No olvides tu carrito! Tus productos te esperan" |
| 3 | 144h (6 days) after email 1 | "Ultima oportunidad — tu carrito expira pronto" |

Emails stop after all 3 are sent or 7 days after the first email (whichever comes first).

## Cart Metadata

The drip state is tracked entirely via cart `metadata`:

| Key | Type | Description |
|-----|------|-------------|
| `abandoned_notify_count` | number (0-3) | How many emails have been sent |
| `abandoned_first_notified_at` | ISO string | Timestamp of the first email sent |

A cart with `abandoned_notify_count: 3` is considered fully notified and will be skipped by the job.

## Architecture

```
Cron Job (midnight daily)
    │
    ├── Query all carts: completed_at = null
    ├── For each cart, check metadata counters vs DRIP_SCHEDULE
    ├── Build list of carts due for their next email
    │
    └── sendAbandonedCartsWorkflow
            │
            ├── sendAbandonedNotificationsStep
            │     └── Creates notification per cart via SMTP module
            │         (passes reminder_number to template)
            │
            └── markCartsNotifiedStep
                  └── Increments abandoned_notify_count in cart metadata
                      Sets abandoned_first_notified_at on first email
```

## Files

### Backend

| File | Purpose |
|------|---------|
| `src/jobs/abandoned-cart-notification.ts` | Cron job — drip scheduling logic |
| `src/workflows/send-abandoned-carts.ts` | Workflow — orchestrates send + mark steps |
| `src/workflows/steps/send-abandoned-notifications.ts` | Step — sends email via notification module |
| `src/modules/smtp-notification/service.ts` | SMTP provider — routes template + dynamic subject |
| `src/modules/smtp-notification/templates/abandoned-cart.ts` | HTML template — 3 variants by `reminder_number` |
| `src/api/store/customers/me/abandoned-cart/route.ts` | Store API — returns customer's abandoned cart |

### Frontend

| File | Purpose |
|------|---------|
| `src/lib/data/cart.ts` | `getAbandonedCart()` — fetches from store API |
| `src/modules/account/components/overview/index.tsx` | `AbandonedCartSection` — shows cart in account |
| `src/app/[countryCode]/(main)/account/@dashboard/page.tsx` | Dashboard page — fetches + passes abandoned cart |
| `src/messages/{es,en}.json` | Translation keys in `account` namespace |

## Store API

### Get Customer's Abandoned Cart

```
GET /store/customers/me/abandoned-cart
Authorization: Bearer <token>

Response: 200
{
  "abandoned_cart": {
    "id": "cart_xxx",
    "updated_at": "2026-03-01T12:00:00.000Z",
    "expires_at": "2026-03-08T12:00:00.000Z",
    "items": [
      {
        "id": "cali_xxx",
        "title": "Mantequilla de Almendra",
        "quantity": 2,
        "thumbnail": "https://...",
        "variant_title": "500g",
        "unit_price": 45000
      }
    ]
  }
}
```

Returns the most recent incomplete cart for the authenticated customer that was updated within the last 7 days and has items. Returns `{ "abandoned_cart": null }` if none found.

## Recovery Flow

1. Email contains a link: `/co/cart/recover/{cart_id}`
2. The existing recover route sets the cart cookie and redirects to `/cart`
3. The customer sees their items and can proceed to checkout

From the account page, the "Recuperar carrito" button links to the same `/cart/recover/{id}` route.

## Email Templates

All 3 emails share the same HTML structure (product table, CTA button, header/footer). What changes per reminder:

- **Subject line** — escalating urgency
- **Intro paragraph** — different messaging
- **CTA button text** — "Completar mi compra" / "Volver a mi carrito" / "Completar mi compra ahora"

The `reminder_number` (1, 2, or 3) is passed through the workflow into the template to select the variant.

## Translation Keys

Added to the `account` namespace in `src/messages/{es,en}.json`:

| Key | ES | EN |
|-----|----|----|
| `abandonedCart` | Carrito Abandonado | Abandoned Cart |
| `abandonedCartMessage` | Dejaste productos en tu carrito | You left items in your cart |
| `recoverCart` | Recuperar carrito | Recover cart |
| `expiresIn` | Expira en {days} dias | Expires in {days} days |

## Extending

**Add a 4th email:** Add an entry to `DRIP_SCHEDULE` in `abandoned-cart-notification.ts`, a new subject/message in `abandoned-cart.ts` template, and update `MAX_AGE_HOURS` if needed.

**Change timing:** Edit `hoursAfterUpdate` / `hoursAfterFirst` values in `DRIP_SCHEDULE`.

**Add discount to last email:** Modify the template for `reminder_number: 3` in `abandoned-cart.ts` to include a promo code. You'd need to generate/pass the code through the workflow data.

**Change cron schedule:** Edit `config.schedule` in `abandoned-cart-notification.ts` (standard cron syntax).
