# Abandoned Cart Recovery Module

Automated 3-email drip campaign for abandoned carts, plus a customer-facing section in the account dashboard to recover their cart.

## What Is An "Abandoned Cart"?

In Medusa, every time a customer adds items to their cart, a `cart` record is created in the database. When they complete checkout, `completed_at` is set and the cart becomes an order. If the customer leaves without checking out, the cart stays in the database with `completed_at: null` — that's an abandoned cart.

**There is no separate "abandoned cart" table.** The system uses Medusa's existing `cart` table and its `metadata` JSON field to track notification state. A cart is considered abandoned when:

1. `completed_at` is `null` (never turned into an order)
2. It has at least one item
3. It has an email (either from the customer account or entered at checkout)
4. It was last updated more than 24 hours ago

## How Carts Get Saved

Carts are saved automatically by Medusa's core — no custom code needed for this part:

1. **Guest visitor** adds items to cart → Medusa creates a cart record, frontend stores `cart_id` in a cookie (`_medusa_cart_id`)
2. **Logged-in customer** adds items → same as above, but the cart also has `customer_id` set
3. Customer enters email at checkout → cart's `email` field is set
4. Customer leaves without completing → cart stays in DB with items intact
5. Cart cookie expires or customer clears browser → cart is "lost" from the customer's perspective, but still exists in the database

The recovery system reconnects the customer to this orphaned cart.

## Drip Schedule — 3 Emails Over 1 Week

A cron job runs **every day at midnight** (`0 0 * * *`). Each run checks all incomplete carts and decides which ones need an email.

| Email | When to Send | Subject (ES) | CTA Button |
|-------|-------------|--------------|------------|
| 1 | 24h after cart's last `updated_at` | "Tu carrito te espera en NutriMercados" | "Completar mi compra" |
| 2 | 72h (3 days) after email 1 was sent | "No olvides tu carrito! Tus productos te esperan" | "Volver a mi carrito" |
| 3 | 144h (6 days) after email 1 was sent | "Ultima oportunidad — tu carrito expira pronto" | "Completar mi compra ahora" |

**Stop conditions** — no more emails are sent when:
- All 3 emails have been sent (`abandoned_notify_count >= 3`)
- More than 7 days (168h) have passed since the first email (`abandoned_first_notified_at` + 168h < now)
- The cart has been completed (customer finished checkout)

## Cart Metadata — How State Is Tracked

All drip state lives in the cart's `metadata` JSON field. No extra database tables or migrations needed.

| Key | Type | Set When | Description |
|-----|------|----------|-------------|
| `abandoned_notify_count` | `number` (0-3) | After each email | How many emails have been sent for this cart |
| `abandoned_first_notified_at` | ISO timestamp string | After email 1 only | When the first email was sent — anchor for emails 2 and 3 |

### Example metadata progression

```
Before any email:     { }
After email 1:        { "abandoned_notify_count": 1, "abandoned_first_notified_at": "2026-03-01T00:00:00.000Z" }
After email 2:        { "abandoned_notify_count": 2, "abandoned_first_notified_at": "2026-03-01T00:00:00.000Z" }
After email 3:        { "abandoned_notify_count": 3, "abandoned_first_notified_at": "2026-03-01T00:00:00.000Z" }
```

Note: `abandoned_first_notified_at` never changes — it's set once on the first email and used as the anchor for all timing calculations.

## Full Flow — Step By Step

### 1. Cron Job Decides Who Gets an Email

**File:** `src/jobs/abandoned-cart-notification.ts`

```
Every midnight:
  1. Query ALL carts where completed_at = null (includes items + variants + products)
  2. For each cart:
     - Skip if no email, no items
     - Read abandoned_notify_count from metadata (default: 0)
     - Read abandoned_first_notified_at from metadata
     - Skip if count >= 3 (all emails sent)
     - Skip if first_notified > 7 days ago (expired)
     - Look up DRIP_SCHEDULE[count] to get timing rule
     - For count=0: check if updated_at > 24h ago
     - For count=1: check if first_notified > 72h ago
     - For count=2: check if first_notified > 144h ago
     - If timing matches → add to cartsToNotify list with reminder_number = count + 1
  3. Pass cartsToNotify to sendAbandonedCartsWorkflow
```

The `DRIP_SCHEDULE` array in the job file controls all timing:
```ts
const DRIP_SCHEDULE = [
  { count: 0, hoursAfterUpdate: 24 },     // Email 1
  { count: 1, hoursAfterFirst: 72 },       // Email 2
  { count: 2, hoursAfterFirst: 144 },      // Email 3
]
```

### 2. Workflow Sends Emails and Updates Metadata

**File:** `src/workflows/send-abandoned-carts.ts`

The workflow has 2 steps that run sequentially:

```
sendAbandonedCartsWorkflow(carts)
  │
  ├── Step 1: sendAbandonedNotificationsStep
  │     For each cart:
  │       → Call notificationService.createNotifications()
  │       → Template: "abandoned-cart"
  │       → Data includes: cart_id, items, customer_name, reminder_number
  │       → Collects list of successfully sent cart IDs
  │
  └── Step 2: markCartsNotifiedStep
        For each cart:
          → Fetch current cart metadata
          → Set abandoned_notify_count = reminder_number
          → If reminder_number == 1: set abandoned_first_notified_at = now
          → Save metadata via cartService.updateCarts()
```

**Important Medusa v2 detail:** In `createWorkflow`, the `input` parameter is a **proxy object**, not a plain JS object. You cannot call `.map()` or other array methods on it directly. The workflow uses `transform()` from `@medusajs/framework/workflows-sdk` to resolve the proxy into a plain object before mapping:

```ts
const markInput = transform({ input }, ({ input }) => ({
  carts: input.carts.map((c) => ({
    id: c.id,
    reminder_number: c.reminder_number,
  })),
}))
markCartsNotifiedStep(markInput)
```

### 3. SMTP Service Picks the Right Subject and Template

**File:** `src/modules/smtp-notification/service.ts`

When the notification module receives a `template: "abandoned-cart"` notification:
1. Calls `getAbandonedCartSubject(reminder_number)` to get the subject line (1 of 3)
2. Calls `abandonedCartTemplate(data)` to render the HTML body

**File:** `src/modules/smtp-notification/templates/abandoned-cart.ts`

The template file exports:
- `SUBJECTS` — maps reminder_number (1, 2, 3) to subject strings
- `MESSAGES` — maps reminder_number to `{ intro, cta }` strings
- `getAbandonedCartSubject(n)` — returns subject for email n
- `abandonedCartTemplate(data)` — renders full HTML email

All 3 emails share the same HTML structure (header, product table, CTA button, footer). Only the intro paragraph, CTA button text, and subject differ.

### 4. Recovery — How the Cart Is Restored

Recovery works via the URL `/{countryCode}/cart/recover/{cart_id}`. This link appears in:
- The recovery emails (hardcoded to `/co/cart/recover/{cart_id}`)
- The "Recuperar carrito" button in the account dashboard

**File (frontend):** `src/app/[countryCode]/(main)/cart/recover/[id]/route.ts`

This is a **Next.js Route Handler** (not a page component). It must be a Route Handler because Next.js 15 does not allow setting cookies in Server Components — only in Route Handlers and Server Actions.

```ts
export async function GET(request, { params }) {
  const { countryCode, id } = await params

  // 1. Set the cart cookie so the cart page loads this cart
  cookieStore.set("_medusa_cart_id", id, { ... })

  // 2. Build redirect URL using reverse proxy headers (not request.url)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  const proto = request.headers.get("x-forwarded-proto") || "https"
  const baseUrl = host ? `${proto}://${host}` : request.url

  // 3. Redirect to the cart page
  return NextResponse.redirect(new URL(`/${countryCode}/cart`, baseUrl))
}
```

**Why `x-forwarded-host` instead of `request.url`:** The frontend runs behind Nginx Proxy Manager (reverse proxy). `request.url` resolves to `localhost:8000` (the internal container address), not the public domain. The reverse proxy sets `x-forwarded-host: nutrimercados.com` and `x-forwarded-proto: https`, which the route handler reads to build the correct public redirect URL.

**Why `<a>` tag instead of `<Link>`:** The "Recuperar carrito" button in the account dashboard uses a regular `<a>` tag, not Next.js `<Link>` or `LocalizedClientLink`. This is because `<Link>` does client-side navigation (fetches a React component), which doesn't work with Route Handlers. Route Handlers only respond to full HTTP requests, which `<a>` tags trigger via browser navigation.

**Cross-browser / cross-device support:** The cart lives in the database, not in the browser. The recovery URL contains the cart ID. When clicked from any browser or device, it sets the cart cookie in that browser and loads the cart. The user doesn't need to be on the same browser/device where they originally added items.

### 5. Customer Account Dashboard — Abandoned Cart Section

Logged-in customers can also see their abandoned cart directly in their account.

**File (backend):** `src/api/store/customers/me/abandoned-cart/route.ts`

```
GET /store/customers/me/abandoned-cart
```

This endpoint:
1. Gets the authenticated customer's ID from `req.auth_context.actor_id`
2. Queries carts where `completed_at = null` AND `customer_id = {id}`
3. Filters to carts with items, updated within the last 7 days
4. Returns the most recent one (sorted by `updated_at` desc)
5. Calculates `expires_at` (7 days after first email, or 7 days after last update if no email sent yet)

Response:
```json
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

Returns `{ "abandoned_cart": null }` if no abandoned cart found.

**File (frontend):** `src/lib/data/cart.ts` — `getAbandonedCart()`

Server action that calls the endpoint above with auth headers. Returns the abandoned cart or null.

**File (frontend):** `src/app/[countryCode]/(main)/account/@dashboard/page.tsx`

The dashboard page fetches the abandoned cart in parallel with orders:
```ts
const [orders, abandonedCart] = await Promise.all([
  listOrders().catch(() => null),
  getAbandonedCart().catch(() => null),
])
```

Passes `abandonedCart` as a prop to the Overview component.

**File (frontend):** `src/modules/account/components/overview/index.tsx`

The `AbandonedCartSection` component renders when `abandonedCart` is not null:
- Shows a heading "Carrito Abandonado" with "Expires in X days" countdown
- Amber-colored card with product thumbnails (up to 4), titles, quantities
- "Recuperar carrito" button — uses a regular `<a>` tag (not `LocalizedClientLink`) to force full HTTP navigation to the Route Handler

The section is completely hidden when there's no abandoned cart.

## Deployment

### Environment Variables

The SMTP notification module requires these env vars. Set them on both the **server** and **worker** deployments (same codebase, different `WORKER_MODE`):

| Variable | Example | Description |
|----------|---------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server hostname |
| `SMTP_PORT` | `465` | SMTP port (465 for SSL, 587 for TLS) |
| `SMTP_SECURE` | `true` | Use SSL/TLS |
| `SMTP_USER` | `noreply@nutrimercados.com` | SMTP login |
| `SMTP_PASS` | `...` | SMTP password |
| `SMTP_FROM` | `NutriMercados <noreply@nutrimercados.com>` | From address |
| `STOREFRONT_URL` | `https://nutrimercados.com` | Used to build recovery links in emails |

### Worker Mode

The server and worker use the **same codebase** (`medusapando-back`), differentiated by the `WORKER_MODE` env var:

- **Server** (`WORKER_MODE=server`): Handles HTTP requests (API, admin). Runs on port 9004.
- **Worker** (`WORKER_MODE=worker`): Runs scheduled jobs (email drip, cleanup) and event subscribers. No HTTP traffic.

The scheduled jobs (`abandoned-cart-notification`, `cleanup-abandoned-carts`) only run on the worker process.

## Files Summary

### Backend (`medusapando-back/`)

| File | What It Does |
|------|-------------|
| `src/jobs/abandoned-cart-notification.ts` | Cron job (midnight). Queries incomplete carts, applies drip schedule, sends emails |
| `src/jobs/cleanup-abandoned-carts.ts` | Cron job (2am). Soft-deletes incomplete carts older than 30 days |
| `src/workflows/send-abandoned-carts.ts` | Medusa workflow with 2 steps. Uses `transform()` to resolve workflow proxy before passing data between steps |
| `src/workflows/steps/send-abandoned-notifications.ts` | Workflow step. Loops through carts, calls `notificationService.createNotifications()` for each with `reminder_number` |
| `src/modules/smtp-notification/service.ts` | SMTP notification provider. Routes `"abandoned-cart"` template, picks dynamic subject via `getAbandonedCartSubject()` |
| `src/modules/smtp-notification/templates/abandoned-cart.ts` | HTML email template. 3 subject/message/CTA variants keyed by `reminder_number`. Exports `getAbandonedCartSubject()` and `abandonedCartTemplate()` |
| `src/api/store/customers/me/abandoned-cart/route.ts` | `GET` endpoint. Returns most recent abandoned cart (within 7 days) for the authenticated customer |

### Frontend (`medusapando-front/`)

| File | What It Does |
|------|-------------|
| `src/lib/data/cart.ts` | `getAbandonedCart()` server action + `AbandonedCart` / `AbandonedCartItem` types |
| `src/app/[countryCode]/(main)/account/@dashboard/page.tsx` | Fetches abandoned cart in parallel with orders, passes to Overview |
| `src/modules/account/components/overview/index.tsx` | `AbandonedCartSection` client component — product thumbnails, expiry countdown, recover button (uses `<a>` tag, not `<Link>`) |
| `src/app/[countryCode]/(main)/cart/recover/[id]/route.ts` | Route Handler — sets cart cookie and redirects to `/cart` using `x-forwarded-host` for correct domain |
| `src/messages/es.json` | Spanish translation keys in `account` namespace |
| `src/messages/en.json` | English translation keys in `account` namespace |

## Translation Keys

In the `account` namespace of `src/messages/{es,en}.json`:

| Key | ES | EN |
|-----|----|----|
| `abandonedCart` | Carrito Abandonado | Abandoned Cart |
| `abandonedCartMessage` | Dejaste productos en tu carrito | You left items in your cart |
| `recoverCart` | Recuperar carrito | Recover cart |
| `expiresIn` | Expira en {days} dias | Expires in {days} days |

## Cart Cleanup — Soft-Deleting Old Carts

### Why Cleanup Is Needed

Medusa v2 has **no built-in cart cleanup**. Every visitor who adds items to a cart creates a `cart` record with associated line items, addresses, shipping methods, tax lines, and adjustments. Without cleanup, these records grow without bound.

### How It Works

A second cron job runs **every day at 2am** (`0 2 * * *`) — separate from the email drip job.

**File:** `src/jobs/cleanup-abandoned-carts.ts`

```
Every day at 2am:
  1. Query all carts where completed_at = null
  2. Filter to carts not updated in 30+ days (CLEANUP_AFTER_DAYS)
  3. For each stale cart:
     a. Dismiss cross-module link records (payment collections, promotions)
     b. Soft-delete the cart via cartService.softDeleteCarts()
  4. Log how many carts were cleaned up
```

### Why Soft Delete (not Hard Delete)

- **Soft delete** sets `deleted_at` on the cart row. The record stays in the DB but is excluded from all queries (Medusa indexes include `WHERE deleted_at IS NULL`).
- It's **reversible** with `cartService.restoreCarts(ids)` if something goes wrong.
- Hard delete (`deleteCarts`) is permanent and irreversible.

### What Gets Cascade-Deleted

When `softDeleteCarts()` is called:

**Automatically handled (cascade):**
- `cart_line_item` — all items in the cart
- `cart_line_item_adjustment` — discounts on items
- `cart_line_item_tax_line` — tax calculations on items
- `cart_shipping_method` — shipping selections
- `cart_shipping_method_adjustment` — shipping discounts
- `cart_shipping_method_tax_line` — shipping tax
- `cart_address` — shipping and billing addresses

**NOT automatically handled (cross-module links):**
- `cart_payment_collection` — link to payment sessions
- `cart_promotion` — link to applied promotions

The cleanup job handles these by calling `link.dismiss()` before soft-deleting.

### Safety Rules

1. **Never delete completed carts** — they are linked to orders via the `order_cart` link table. Deleting them would break order history. The job only queries `completed_at: null`.
2. **30-day buffer** — the drip campaign ends at 7 days, the account dashboard shows carts within 7 days. 30 days gives plenty of buffer for late recoveries.
3. **Link cleanup first** — cross-module link records are dismissed before soft-deleting, preventing orphan records.

### Timeline

```
Day 0:  Customer abandons cart
Day 1:  Email 1 sent (24h after cart update)
Day 3:  Email 2 sent (72h after email 1)
Day 6:  Email 3 sent (144h after email 1)
Day 7:  Drip campaign ends, cart disappears from account dashboard
Day 30: Cart is soft-deleted by cleanup job
```

## Gotchas and Important Notes

1. **Workflow proxy objects:** In Medusa v2 `createWorkflow`, the `input` parameter is a proxy — not a real JS object. You MUST use `transform()` to resolve it before calling `.map()`, `.filter()`, or accessing nested properties. Calling `input.carts.map(...)` directly will crash the backend on startup with `input.carts.map is not a function`.

2. **Recovery route must be a Route Handler (`route.ts`), not a page (`page.tsx`):** Next.js 15 does not allow setting cookies in Server Components. The recover route sets the `_medusa_cart_id` cookie, so it must be a Route Handler. Using `page.tsx` will crash with `Cookies can only be modified in a Server Action or Route Handler`.

3. **Recovery button must use `<a>` tag, not `<Link>`:** Next.js `<Link>` (and `LocalizedClientLink`) does client-side navigation, which fetches a React component. Route Handlers only respond to full HTTP requests. Using `<Link>` to navigate to a `route.ts` will fail with a 404. Use a regular `<a>` tag to force browser navigation.

4. **Redirect must use `x-forwarded-host`, not `request.url`:** The frontend runs behind Nginx Proxy Manager. `request.url` resolves to `localhost:8000` (internal), not the public domain. The route handler reads `x-forwarded-host` and `x-forwarded-proto` headers set by the reverse proxy to build the correct public URL for the redirect.

5. **Email timing is checked once per day:** The cron runs at midnight. A cart abandoned at 11pm will get email 1 at midnight the next day (~25h later), not exactly at 24h. This is intentional — batching reduces server load.

6. **Guest carts vs logged-in carts:** The email drip works for ALL carts with an email (including guests). The account dashboard section only works for logged-in customers (requires `customer_id` on the cart).

7. **Cart gets completed mid-drip:** If a customer completes their purchase after email 1, the cart's `completed_at` gets set. The cron job filters for `completed_at: null`, so emails 2 and 3 will never be sent. No extra cleanup needed.

8. **Customer creates a new cart:** If a customer abandons cart A, then comes back and creates cart B, both carts exist in the database. The email drip continues for cart A (it still has `completed_at: null`). The account dashboard shows the most recent one sorted by `updated_at`.

9. **Recovery link country code:** The email template currently hardcodes `/co/` in the recovery URL. If you add more countries, update the template to use the cart's country code dynamically.

10. **Cross-browser recovery:** The cart lives in the database, not in the browser. The recovery URL contains the cart ID. Clicking it from any browser or device sets the cookie in that browser and loads the cart. Works across devices.

## Extending

**Add a 4th email:** Add an entry to `DRIP_SCHEDULE` in `abandoned-cart-notification.ts` (e.g., `{ count: 3, hoursAfterFirst: 160 }`), add subject/message for key `4` in the template's `SUBJECTS` and `MESSAGES` maps, and update `MAX_AGE_HOURS` if needed.

**Change timing:** Edit `hoursAfterUpdate` / `hoursAfterFirst` values in `DRIP_SCHEDULE`.

**Add discount to last email:** Modify the `MESSAGES[3]` in `abandoned-cart.ts` to include a promo code in the intro text. If you need a dynamic code, generate it in the cron job and pass it through the workflow data.

**Change cron schedule:** Edit `config.schedule` in `abandoned-cart-notification.ts`. Value is standard cron syntax (e.g., `"0 */6 * * *"` for every 6 hours).

**Internationalize email templates:** Currently emails are Spanish-only. To support multiple languages, pass the customer's locale through the workflow data and add locale-based `SUBJECTS`/`MESSAGES` maps in the template file.

**Change cleanup threshold:** Edit `CLEANUP_AFTER_DAYS` in `cleanup-abandoned-carts.ts` (default: 30 days).

**Hard-delete instead of soft-delete:** Replace `cartService.softDeleteCarts(ids)` with `cartService.deleteCarts(ids)` in the cleanup job. This is permanent and irreversible — only do this if disk space is a concern.

**Restore a soft-deleted cart:** Call `cartService.restoreCarts(["cart_xxx"])` from a script or admin endpoint. The cart and its cascaded children will be restored.
