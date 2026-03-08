# Developer Guide — Modules, Events & Email Integration

How to create custom Medusa v2 modules, emit events, subscribe to them, and integrate with the email notification system in this project.

---

## Table of Contents

1. [Creating a Custom Module](#1-creating-a-custom-module)
2. [Registering the Module](#2-registering-the-module)
3. [Creating Database Migrations](#3-creating-database-migrations)
4. [Linking Modules to Core Entities](#4-linking-modules-to-core-entities)
5. [Adding API Routes](#5-adding-api-routes)
6. [Emitting Custom Events](#6-emitting-custom-events)
7. [Subscribing to Events](#7-subscribing-to-events)
8. [Integrating with the Email System](#8-integrating-with-the-email-system)
9. [End-to-End Example: Loyalty Module](#9-end-to-end-example-loyalty-module)
10. [Checklist](#10-checklist)

---

## 1. Creating a Custom Module

Every custom module lives in `src/modules/{module-name}/` with this structure:

```
src/modules/my-module/
├── models/
│   └── my-entity.ts      # Entity definition (model.define)
├── service.ts             # Service class (extends MedusaService)
├── index.ts               # Module export (Module())
└── migrations/            # Auto-generated migrations
```

### 1.1 Define the Entity

Use `model.define()` — **never** raw MikroORM decorators.

```typescript
// src/modules/my-module/models/my-entity.ts
import { model } from "@medusajs/framework/utils"

export const MyEntity = model.define("my_entity", {
  id: model.id().primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
  metadata: model.json().nullable(),
})
```

**Real example** — Brand module (`src/modules/brand/models/brand.ts`):

```typescript
import { model } from "@medusajs/framework/utils"

export const Brand = model.define("brand", {
  id: model.id().primaryKey(),
  name: model.text(),
  handle: model.text().nullable(),
})
```

### 1.2 Create the Service

Extend `MedusaService` — this gives you free CRUD methods (`create`, `retrieve`, `update`, `delete`, `list`, `listAndCount`).

```typescript
// src/modules/my-module/service.ts
import { MedusaService } from "@medusajs/framework/utils"
import { MyEntity } from "./models/my-entity"

class MyModuleService extends MedusaService({
  MyEntity,
}) {
  // Add custom methods here if needed
}

export default MyModuleService
```

The base `MedusaService` auto-generates methods like:
- `createMyEntities(data)`
- `retrieveMyEntity(id, config?)`
- `updateMyEntities(idOrSelector, data)`
- `deleteMyEntities(ids)`
- `listMyEntities(filters?, config?)`
- `listAndCountMyEntities(filters?, config?)`

Add custom methods for business logic that goes beyond CRUD:

```typescript
class MyModuleService extends MedusaService({
  MyEntity,
}) {
  async findActiveByName(name: string) {
    const [entities] = await this.listMyEntities({
      name,
      is_active: true,
    })
    return entities
  }
}
```

### 1.3 Export the Module

```typescript
// src/modules/my-module/index.ts
import { Module } from "@medusajs/framework/utils"
import MyModuleService from "./service"

export const MY_MODULE = "myModule"

export default Module(MY_MODULE, {
  service: MyModuleService,
})
```

The `MY_MODULE` constant is used everywhere to resolve the service from the DI container.

---

## 2. Registering the Module

Add the module to `medusa-config.ts` inside the `modules` array:

```typescript
// medusa-config.ts
module.exports = defineConfig({
  // ...
  modules: [
    // ... existing modules ...

    // My Module
    {
      resolve: "./src/modules/my-module",
    },
  ],
})
```

After adding, run:

```bash
npx medusa db:generate myModule       # Generate migration
npx medusa db:migrate                 # Apply migration
```

---

## 3. Creating Database Migrations

Migrations are auto-generated from your model definitions:

```bash
# Generate a new migration for your module
npx medusa db:generate myModule

# Apply all pending migrations
npx medusa db:migrate
```

Migrations are created in `src/modules/my-module/migrations/` with timestamp filenames. **Never edit these manually** — if you need schema changes, update the model and generate a new migration.

---

## 4. Linking Modules to Core Entities

To relate your module to Medusa core entities (products, orders, etc.), use `defineLink()` in `src/links/`:

```typescript
// src/links/product-my-entity.ts
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import { MY_MODULE } from "../modules/my-module"

export default defineLink(ProductModule.linkable.product, {
  linkable: MY_MODULE,
  field: "my_entity",
})
```

**Real example** — Product-Brand link (`src/links/product-brand.ts`):

```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import { BRAND_MODULE } from "../modules/brand"

export default defineLink(ProductModule.linkable.product, {
  linkable: BRAND_MODULE,
  field: "brand",
})
```

After creating a link, generate and run migrations:

```bash
npx medusa db:generate
npx medusa db:migrate
```

---

## 5. Adding API Routes

### Admin Routes (auto-authenticated)

```typescript
// src/api/admin/my-module/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MY_MODULE } from "../../../modules/my-module"
import type MyModuleService from "../../../modules/my-module/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(MY_MODULE) as MyModuleService
  const [items, count] = await service.listAndCountMyEntities(
    {},
    { take: 50, skip: 0 }
  )
  res.json({ items, count })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(MY_MODULE) as MyModuleService
  const item = await service.createMyEntities(req.body)
  res.json({ item })
}
```

### Store Routes (public)

```typescript
// src/api/store/my-module/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MY_MODULE } from "../../../modules/my-module"
import type MyModuleService from "../../../modules/my-module/service"

export const AUTHENTICATE = false   // <-- public route

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve(MY_MODULE) as MyModuleService
  const [items] = await service.listMyEntities({ is_active: true })
  res.json({ items })
}
```

---

## 6. Emitting Custom Events

There are two ways to emit events in Medusa v2:

### 6.1 Module-Level Events (Automatic)

When you use `MedusaService`, Medusa automatically emits CRUD events for your entities:

| Action | Event Pattern | Example |
|--------|--------------|---------|
| Create | `{module}.{entity}.created` | `myModule.my_entity.created` |
| Update | `{module}.{entity}.updated` | `myModule.my_entity.updated` |
| Delete | `{module}.{entity}.deleted` | `myModule.my_entity.deleted` |

These fire automatically — **no code needed**. You can subscribe to them immediately.

### 6.2 Custom Events (Manual)

For business-specific events, emit them from your service or API routes using the Event Bus:

**From a service method:**

```typescript
// src/modules/my-module/service.ts
import { MedusaService } from "@medusajs/framework/utils"
import { MyEntity } from "./models/my-entity"

class MyModuleService extends MedusaService({
  MyEntity,
}) {
  async completeMyEntity(id: string, container: any) {
    const entity = await this.retrieveMyEntity(id)

    // ... business logic ...

    await this.updateMyEntities(id, { is_active: false })

    // Emit custom event
    const eventBus = container.resolve("event_bus") as any
    await eventBus.emit("my-entity.completed", {
      data: { id: entity.id, name: entity.name },
    })

    return entity
  }
}
```

**From a workflow step** (recommended for multi-step operations):

```typescript
// src/workflows/steps/complete-my-entity.ts
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { MY_MODULE } from "../../modules/my-module"

export const completeMyEntityStep = createStep(
  "complete-my-entity",
  async (input: { id: string }, { container }) => {
    const service = container.resolve(MY_MODULE) as any
    const entity = await service.updateMyEntities(input.id, {
      is_active: false,
    })
    return new StepResponse(entity, input.id)
  },
  // Compensation (rollback)
  async (id, { container }) => {
    const service = container.resolve(MY_MODULE) as any
    await service.updateMyEntities(id, { is_active: true })
  }
)
```

```typescript
// src/workflows/complete-my-entity.ts
import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"
import { completeMyEntityStep } from "./steps/complete-my-entity"

export const completeMyEntityWorkflow = createWorkflow(
  "complete-my-entity",
  (input: { id: string }) => {
    const entity = completeMyEntityStep(input)

    emitEventStep({
      eventName: "my-entity.completed",
      data: { id: input.id },
    })

    return new WorkflowResponse(entity)
  }
)
```

**From an API route:**

```typescript
// src/api/admin/my-module/[id]/complete/route.ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { completeMyEntityWorkflow } from "../../../../workflows/complete-my-entity"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { result } = await completeMyEntityWorkflow(req.scope).run({
    input: { id: req.params.id },
  })
  res.json({ item: result })
}
```

### Event Naming Convention

Follow Medusa's pattern:

| Pattern | Example | When to Use |
|---------|---------|-------------|
| `{entity}.{past_action}` | `my-entity.completed` | High-level workflow events |
| `{module}.{entity}.{action}` | `myModule.my_entity.created` | Auto-generated CRUD events |

---

## 7. Subscribing to Events

Create a subscriber file in `src/subscribers/`:

```typescript
// src/subscribers/my-entity-completed.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

type MyEntityCompletedData = {
  id: string
  name?: string
}

export default async function myEntityCompletedHandler({
  event: { data },
  container,
}: SubscriberArgs<MyEntityCompletedData>) {
  console.log(`Entity ${data.id} was completed!`)
  // Your logic here
}

export const config: SubscriberConfig = {
  event: "my-entity.completed",
}
```

### Subscribe to Multiple Events

```typescript
export const config: SubscriberConfig = {
  event: ["my-entity.completed", "my-entity.canceled"],
}
```

### Subscribe to Module-Level CRUD Events

```typescript
export const config: SubscriberConfig = {
  event: "myModule.my_entity.created",    // Auto-generated by MedusaService
}
```

---

## 8. Integrating with the Email System

This project has **two paths** for sending emails. Choose the right one based on your use case.

### Path A: Notification Module (Medusa events → subscriber → template)

**Use this for:** Emails triggered by Medusa events (order placed, customer created, etc.)

This is the standard path. It requires 3 steps:

#### Step 1: Create the Email Template

```typescript
// src/modules/smtp-notification/templates/my-entity-completed.ts
import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
} from "./shared"

type MyEntityCompletedData = {
  entity_name?: string
  customer_name?: string
  storefront_url?: string
  [key: string]: unknown
}

export function myEntityCompletedSubject(data: MyEntityCompletedData): string {
  return `Completado: ${data.entity_name || "tu solicitud"} | ${STORE_NAME}`
}

export function myEntityCompletedTemplate(data: MyEntityCompletedData): string {
  const storefrontUrl = data.storefront_url || STORE_URL
  const greeting = data.customer_name
    ? `Hola ${escapeHtml(data.customer_name)},`
    : "Hola,"

  const content = `
    ${sectionTitle("Solicitud completada")}
    ${paragraph(greeting)}
    ${paragraph(`Tu solicitud <strong>${escapeHtml(data.entity_name || "")}</strong> ha sido completada exitosamente.`)}

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/account`, "Ver mi cuenta")}
    ${paragraph("Gracias por confiar en nosotros.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Tu solicitud fue completada — ${STORE_NAME}`,
  })
}
```

**Template rules:**
- Import helpers from `./shared` — never write raw HTML wrappers
- Export two functions: `*Subject(data)` → string, `*Template(data)` → string
- Use `emailWrapper()` for the outer shell (logo, footer, branding)
- Use `escapeHtml()` on ALL dynamic strings
- Use `ctaButton()`, `paragraph()`, `sectionTitle()`, `infoBox()`, `productThumbnail()` helpers
- Brand colors: `BRAND_GREEN` (#5B8C3E), `BRAND_ORANGE` (#DA763E)

**Available shared helpers** (`src/modules/smtp-notification/templates/shared.ts`):

| Helper | Description |
|--------|-------------|
| `emailWrapper(content, opts?)` | Full HTML email with logo, header, footer |
| `ctaButton(href, label, color?)` | Centered CTA button (defaults to `BRAND_GREEN`) |
| `sectionTitle(text)` | H2 heading |
| `paragraph(text, opts?)` | Styled `<p>` — supports `muted`, `center`, `small` |
| `divider()` | Horizontal line |
| `infoBox(content)` | Grey rounded box |
| `productThumbnail(src, alt)` | 96x96 product image |
| `formatCOP(amount)` | Format as Colombian pesos |
| `escapeHtml(str)` | Sanitize HTML entities |

#### Step 2: Register the Template in the SMTP Provider

Edit `src/modules/smtp-notification/service.ts`:

```typescript
// Add import at the top
import {
  myEntityCompletedTemplate,
  myEntityCompletedSubject,
} from "./templates/my-entity-completed"

// Add case in the switch statement inside send()
case "my-entity-completed":
  subject = myEntityCompletedSubject(templateData)
  html = myEntityCompletedTemplate(templateData)
  break
```

#### Step 3: Create the Subscriber

```typescript
// src/subscribers/my-entity-completed.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { MY_MODULE } from "../modules/my-module"
import type MyModuleService from "../modules/my-module/service"

export default async function myEntityCompletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    // 1. Resolve services and fetch data
    const myService = container.resolve(MY_MODULE) as MyModuleService
    const entity = await myService.retrieveMyEntity(data.id)

    // 2. Determine recipient (skip if no email)
    const recipientEmail = entity.metadata?.email
    if (!recipientEmail) return

    // 3. Send via notifyWithAudit — this handles both email + audit log
    await notifyWithAudit(container, {
      to: recipientEmail,
      channel: "email",
      template: "my-entity-completed",   // Must match the case in service.ts
      data: {
        entity_name: entity.name,
        customer_name: entity.metadata?.customer_name,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to send my-entity-completed email:", error)
  }
}

export const config: SubscriberConfig = {
  event: "my-entity.completed",   // The event name you're listening to
}
```

**Important:** Always use `notifyWithAudit()` instead of calling `notificationService.createNotifications()` directly. It handles both the notification AND audit logging in one call.

#### `notifyWithAudit()` Parameters

```typescript
await notifyWithAudit(container, {
  to: "customer@example.com",        // Recipient email
  channel: "email",                   // Always "email" for SMTP
  template: "my-entity-completed",    // Template name (matches switch case)
  data: { /* template variables */ }, // Passed to template functions
  subject: "Optional override",       // Optional — usually let template handle it
})
```

### Path B: Direct Email (outside Medusa event flow)

**Use this for:** Emails triggered by webhooks, scheduled jobs, or custom API endpoints — anything that doesn't come from a Medusa event.

```typescript
import { sendEmail } from "../utils/email-sender"
import type EmailAuditModuleService from "../modules/email-audit/service"
import { emailWrapper, sectionTitle, paragraph, ctaButton } from "../modules/smtp-notification/templates/shared"

// Build the HTML using shared helpers
const html = emailWrapper(`
  ${sectionTitle("Your Subject")}
  ${paragraph("Hello, this is a direct email.")}
  ${ctaButton("https://example.com", "Click here")}
`, {
  preheader: "Preview text for email clients",
})

// Get audit service for logging (optional but recommended)
let auditService: EmailAuditModuleService | undefined
try {
  auditService = container.resolve("emailAudit") as EmailAuditModuleService
} catch {}

// Send
await sendEmail(
  {
    to: "customer@example.com",
    subject: "Your Subject",
    html,
    email_type: "my-custom-type",              // For audit filtering
    metadata: { orderId: "order_123" },        // Optional audit context
  },
  auditService
)
```

**Real example** — Wompi payment emails use this path because they're triggered by an external webhook, not a Medusa event. See `src/utils/wompi-email.ts`.

### When to Use Which Path

| Scenario | Path | Why |
|----------|------|-----|
| Medusa event fires → send email | **A** (notifyWithAudit) | Standard Medusa flow, audit-logged automatically |
| External webhook → send email | **B** (sendEmail) | No Medusa event, webhook handler controls flow |
| Scheduled job → send email | **B** (sendEmail) | Job runs outside event system |
| Admin action (API route) → send email | **B** (sendEmail) | Direct trigger, no event needed |
| Workflow step → send email | **A** (notifyWithAudit) | Workflows can emit events that trigger subscribers |

### Rule: Never Use Nodemailer Directly

**Always** use one of these two paths:
1. `notifyWithAudit()` → goes through Medusa Notification Module → SMTP Provider
2. `sendEmail()` → direct SMTP with audit logging

Both paths ensure emails are audit-logged and use the correct SMTP settings (DB or env vars). Using `nodemailer` directly bypasses audit logging and settings management.

---

## 9. End-to-End Example: Loyalty Module

Let's build a complete module that awards loyalty points when an order is completed, and emails the customer.

### 9.1 Entity

```typescript
// src/modules/loyalty/models/loyalty-points.ts
import { model } from "@medusajs/framework/utils"

export const LoyaltyPoints = model.define("loyalty_points", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  order_id: model.text(),
  points: model.number(),
  reason: model.text(),
})
```

### 9.2 Service

```typescript
// src/modules/loyalty/service.ts
import { MedusaService } from "@medusajs/framework/utils"
import { LoyaltyPoints } from "./models/loyalty-points"

class LoyaltyModuleService extends MedusaService({
  LoyaltyPoints,
}) {
  async getCustomerBalance(customerId: string): Promise<number> {
    const [records] = await this.listLoyaltyPointss({
      customer_id: customerId,
    })
    return records.reduce((sum: number, r: any) => sum + r.points, 0)
  }
}

export default LoyaltyModuleService
```

### 9.3 Module Export

```typescript
// src/modules/loyalty/index.ts
import { Module } from "@medusajs/framework/utils"
import LoyaltyModuleService from "./service"

export const LOYALTY_MODULE = "loyalty"

export default Module(LOYALTY_MODULE, {
  service: LoyaltyModuleService,
})
```

### 9.4 Register in medusa-config.ts

```typescript
// medusa-config.ts — add to modules array
{
  resolve: "./src/modules/loyalty",
},
```

### 9.5 Email Template

```typescript
// src/modules/smtp-notification/templates/loyalty-points-earned.ts
import {
  emailWrapper,
  escapeHtml,
  ctaButton,
  sectionTitle,
  paragraph,
  infoBox,
  formatCOP,
  STORE_NAME,
  STORE_URL,
  BRAND_GREEN,
} from "./shared"

type LoyaltyPointsData = {
  customer_name?: string
  points_earned?: number
  total_balance?: number
  order_display_id?: string | number
  storefront_url?: string
  [key: string]: unknown
}

export function loyaltyPointsEarnedSubject(data: LoyaltyPointsData): string {
  return `Ganaste ${data.points_earned || 0} puntos | ${STORE_NAME}`
}

export function loyaltyPointsEarnedTemplate(data: LoyaltyPointsData): string {
  const storefrontUrl = data.storefront_url || STORE_URL
  const greeting = data.customer_name
    ? `Hola ${escapeHtml(data.customer_name)},`
    : "Hola,"

  const content = `
    <!-- Points icon -->
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; background-color: #f0f7ec; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; text-align: center;">
        <span style="font-size: 28px;">&#11088;</span>
      </div>
    </div>

    ${sectionTitle("Puntos de fidelidad ganados")}
    ${paragraph(greeting)}
    ${paragraph(`Por tu pedido <strong>#${escapeHtml(String(data.order_display_id || ""))}</strong> has ganado:`)}

    <!-- Points highlight -->
    <div style="background: linear-gradient(135deg, #f0f7ec 0%, #fdf6f0 100%); border-radius: 10px; padding: 24px; margin: 20px 0; text-align: center; border: 1px solid #e5e7eb;">
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 36px; color: ${BRAND_GREEN}; margin: 0; font-weight: 700;">
        +${data.points_earned || 0}
      </p>
      <p style="font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #6B7280; margin: 4px 0 0;">puntos</p>
    </div>

    ${infoBox(`
      <p style="margin: 0; font-family: 'Inter', Arial, sans-serif; font-size: 14px; color: #374151;">
        <strong>Tu saldo total:</strong> ${data.total_balance || 0} puntos
      </p>
    `)}

    ${ctaButton(`${escapeHtml(storefrontUrl)}/co/account`, "Ver mi cuenta")}
    ${paragraph("Acumula puntos con cada compra y canjealos en tu proximo pedido.", { muted: true, center: true, small: true })}`

  return emailWrapper(content, {
    preheader: `Ganaste ${data.points_earned || 0} puntos en ${STORE_NAME}`,
  })
}
```

### 9.6 Register Template in SMTP Provider

Edit `src/modules/smtp-notification/service.ts`:

```typescript
// Add import
import {
  loyaltyPointsEarnedTemplate,
  loyaltyPointsEarnedSubject,
} from "./templates/loyalty-points-earned"

// Add case in switch
case "loyalty-points-earned":
  subject = loyaltyPointsEarnedSubject(templateData)
  html = loyaltyPointsEarnedTemplate(templateData)
  break
```

### 9.7 Subscriber (listens to `order.completed`)

```typescript
// src/subscribers/loyalty-points-earned.ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { notifyWithAudit } from "../utils/notify-with-audit"
import { LOYALTY_MODULE } from "../modules/loyalty"
import type LoyaltyModuleService from "../modules/loyalty/service"

const POINTS_PER_10K_COP = 1  // 1 point per $10,000 COP spent

export default async function loyaltyPointsHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  try {
    // 1. Fetch the order
    const orderService = container.resolve(Modules.ORDER) as any
    const order = await orderService.retrieveOrder(data.id, {
      relations: ["shipping_address", "summary"],
    })

    if (!order?.email) return

    // 2. Calculate points
    const total = Number(order.total ?? order.summary?.current_order_total ?? 0)
    const points = Math.floor(total / 10000) * POINTS_PER_10K_COP
    if (points <= 0) return

    // 3. Award points
    const loyaltyService = container.resolve(LOYALTY_MODULE) as LoyaltyModuleService
    await loyaltyService.createLoyaltyPointss({
      customer_id: order.customer_id,
      order_id: order.id,
      points,
      reason: `Pedido #${order.display_id}`,
    })

    // 4. Get total balance
    const balance = await loyaltyService.getCustomerBalance(order.customer_id)

    // 5. Email customer
    const customerName = order.shipping_address
      ? [order.shipping_address.first_name, order.shipping_address.last_name]
          .filter(Boolean)
          .join(" ")
      : ""

    await notifyWithAudit(container, {
      to: order.email,
      channel: "email",
      template: "loyalty-points-earned",
      data: {
        customer_name: customerName,
        points_earned: points,
        total_balance: balance,
        order_display_id: order.display_id,
      },
    })
  } catch (error) {
    console.error("[Subscriber] Failed to award loyalty points:", error)
  }
}

export const config: SubscriberConfig = {
  event: "order.completed",
}
```

### 9.8 Generate Migration & Test

```bash
npx medusa db:generate loyalty
npx medusa db:migrate
yarn dev
```

The complete flow:
1. Admin marks order as completed → `completeOrderWorkflow` runs
2. Medusa emits `order.completed` event
3. Subscriber fires → creates loyalty record → emails customer
4. Email appears in admin audit log (Settings > Emails)

---

## 10. Checklist

Use this when adding a new module with email notifications:

### New Module
- [ ] Create `src/modules/{name}/models/{entity}.ts` with `model.define()`
- [ ] Create `src/modules/{name}/service.ts` extending `MedusaService`
- [ ] Create `src/modules/{name}/index.ts` with `Module()` export and constant
- [ ] Register in `medusa-config.ts` modules array
- [ ] Run `npx medusa db:generate {name}` and `npx medusa db:migrate`
- [ ] (Optional) Create link in `src/links/` if relating to core entities

### New API Routes
- [ ] Create `src/api/admin/{name}/route.ts` for admin endpoints
- [ ] Create `src/api/store/{name}/route.ts` with `AUTHENTICATE = false` for public endpoints
- [ ] Resolve services from `req.scope.resolve(MODULE_KEY)` — never instantiate directly

### New Email Notification
- [ ] Create template in `src/modules/smtp-notification/templates/{template-name}.ts`
  - Export `{templateName}Subject(data)` and `{templateName}Template(data)`
  - Use `emailWrapper()`, `escapeHtml()`, and shared helpers
- [ ] Register template in `src/modules/smtp-notification/service.ts` (import + switch case)
- [ ] Create subscriber in `src/subscribers/{event-name}.ts`
  - Use `notifyWithAudit()` for sending
  - Export `config` with `event` name
- [ ] Test by triggering the event (create order, update product, etc.)
- [ ] Verify email appears in admin audit log (Settings > Emails)

### Custom Events
- [ ] Use `emitEventStep()` in workflows for high-level events
- [ ] Or resolve `event_bus` from container for direct emission
- [ ] Follow naming: `{entity}.{past_action}` (e.g., `loyalty.points_earned`)

### Documentation
- [ ] Add event to `docs/MEDUSA-EVENTS.md` (Vita Integral section)
- [ ] Update `.claude-context.md` if significant new module
