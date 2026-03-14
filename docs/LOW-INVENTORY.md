# Low Inventory Notifications

Automatic email alerts when product stock drops below a configurable threshold after each Nubex ERP sync.

## User Guide

### Setup

1. Go to **Admin > Nubex ERP**
2. Find the **"Alertas de inventario bajo"** card (below the sync status, above the history table)
3. Click **"Editar"**
4. Configure:
   - **Limite de stock**: minimum quantity — any product below this number triggers the alert (e.g., `5`)
   - **Email de notificacion**: one or more emails separated by comma (e.g., `admin@vitaintegral.co, bodega@vitaintegral.co`)
   - **Notificaciones**: toggle ON to enable
5. Click **"Guardar"**

The card shows **Activo** (green) or **Inactivo** (grey) badge to indicate the current state.

### When are notifications sent?

After **every Nubex sync** (scheduled every 15 min, or manual via "Sincronizar ahora"), the system:

1. Compares the ERP quantity of each matched product against the configured threshold
2. If any products are below the threshold, sends **one email** listing all of them
3. The email is **not** sent if no products are below the threshold

### Email content

The notification email includes:

- **Sin stock** (red table): products at exactly 0 units
- **Stock bajo** (amber table): products between 1 and threshold-1 units
- Each row shows: SKU, product name, variant name, current quantity
- Sync date and total count summary
- Branded Vita Integral design (logo, colors, footer)

### Viewing notification history

All sent notifications appear in **Admin > Correos** (email audit dashboard):

- **Type filter**: select `low-inventory` to see only stock alerts
- **Status**: sent / failed
- **Metadata**: shows item count, zero-stock count, low-stock count, and threshold used

### Multiple recipients

The email field accepts comma-separated addresses. All recipients receive the same email. Each address is validated individually when saving.

### Disabling

Click "Editar", toggle notifications OFF, click "Guardar". The sync continues normally — only the email notification stops.

---

## Developer Guide

### Architecture

```
Nubex Sync (cron/manual)
    |
    v
Step 11: Check low stock
    |
    ├── Read settings from nubex_settings table
    ├── Compare ERP quantities against threshold
    ├── Collect items below threshold
    |
    v
sendLowStockNotification()
    |
    ├── Build HTML from lowInventoryTemplate()
    ├── Send via sendEmail() (nodemailer)
    └── Log to email_audit table (type: "low-inventory")
```

### Files

| File | Purpose |
|------|---------|
| `src/modules/nubex/models/nubex-settings.ts` | `NubexSettings` entity (threshold, email, enabled) |
| `src/modules/nubex/migrations/Migration20260314120000.ts` | Creates `nubex_settings` table |
| `src/modules/nubex/service.ts` | `getNubexSettings()`, `upsertNubexSettings()` |
| `src/api/admin/nubex/settings/route.ts` | `GET/POST /admin/nubex/settings` |
| `src/utils/nubex-sync.ts` | Step 11 — low stock check after inventory sync |
| `src/utils/nubex-low-stock-email.ts` | `sendLowStockNotification()` |
| `src/modules/smtp-notification/templates/low-inventory.ts` | Email template (branded HTML) |
| `src/modules/email-audit/types/index.ts` | `"low-inventory"` email type |
| `src/admin/routes/nubex/page.tsx` | `LowStockSettings` UI component |

### Database

**Table: `nubex_settings`** (single row, upsert pattern)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | TEXT | auto | Primary key |
| `low_stock_threshold` | INTEGER | 5 | Minimum stock level before alert |
| `notification_email` | TEXT | null | Comma-separated recipient emails |
| `low_stock_enabled` | BOOLEAN | false | Enable/disable notifications |
| `created_at` | TIMESTAMPTZ | now | |
| `updated_at` | TIMESTAMPTZ | now | |
| `deleted_at` | TIMESTAMPTZ | null | Soft delete |

### API

#### Get settings

```
GET /admin/nubex/settings
```

**Response:**
```json
{
  "settings": {
    "low_stock_threshold": 5,
    "notification_email": "admin@vitaintegral.co, bodega@vitaintegral.co",
    "low_stock_enabled": true
  }
}
```

Returns `{ "settings": null }` if never configured.

#### Update settings

```
POST /admin/nubex/settings
Content-Type: application/json
```

**Body:**
```json
{
  "low_stock_threshold": 10,
  "notification_email": "admin@vitaintegral.co",
  "low_stock_enabled": true
}
```

**Validation:**
- `low_stock_threshold` must be a number >= 0
- `notification_email` required when `low_stock_enabled` is true
- Each comma-separated email is validated individually

**Response:**
```json
{
  "success": true
}
```

### Email integration

The notification uses `sendEmail()` from `src/utils/email-sender.ts` (Path 2 in the email system). This means:

- Email is automatically logged in the `email_audit` table
- Status tracking: queued → sent / failed
- Visible in Admin > Correos with type `low-inventory`
- Uses DB SMTP settings if configured, falls back to env vars

### Sync integration

The low-stock check is in `src/utils/nubex-sync.ts`, step 11, right after inventory updates and before cache revalidation. It is:

- **Non-blocking**: if the email fails, the sync still completes successfully
- **Per-sync**: runs on every sync (scheduled + manual)
- **ERP-based**: compares against ERP quantities, not Medusa inventory levels
- **Threshold-based**: strict less-than comparison (`qty < threshold`)

### Email template

`src/modules/smtp-notification/templates/low-inventory.ts` uses the shared template system:

- `emailWrapper()` — branded layout with logo, gradient header, footer
- `escapeHtml()` — XSS protection on all dynamic content (SKU, product names)
- Two color-coded tables: red (zero stock), amber (low stock)
- `sectionTitle()`, `paragraph()`, `divider()`, `infoBox()` — shared helpers

### Adding to the email audit type list

The type `"low-inventory"` was added to `src/modules/email-audit/types/index.ts`. This is optional since the type is `| string` (catch-all), but explicit types help with filtering in the admin UI.

### Deployment

1. Run `npx medusa db:migrate` — creates `nubex_settings` table
2. Build and deploy backend
3. Configure in Admin > Nubex ERP > Alertas de inventario bajo
