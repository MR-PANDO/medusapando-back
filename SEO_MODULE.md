# SEO / AEO / GEO / SXO Module

Self-contained Medusa v2 module that manages four pillars of search optimization for every product, category, and static page.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [How It Works — Request Flow](#how-it-works--request-flow)
3. [Four Pillars](#four-pillars)
4. [Data Model](#data-model)
5. [Score Calculation](#score-calculation)
6. [Backend — Module & Service](#backend--module--service)
7. [Backend — API Routes](#backend--api-routes)
8. [Backend — Validation & Middleware](#backend--validation--middleware)
9. [Admin UI — Widgets](#admin-ui--widgets)
10. [Admin UI — SEO Manager (Static Pages)](#admin-ui--seo-manager-static-pages)
11. [Frontend — Data Layer](#frontend--data-layer)
12. [Frontend — Components](#frontend--components)
13. [Frontend — Page Integration](#frontend--page-integration)
14. [Security Hardening](#security-hardening)
15. [File Manifest](#file-manifest)
16. [Adding SEO to a New Page](#adding-seo-to-a-new-page)
17. [Development Workflow](#development-workflow)
18. [Client / Production Guide](#client--production-guide)
19. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
                    ADMIN DASHBOARD                          STOREFRONT (Next.js)
              ┌──────────────────────┐               ┌───────────────────────────┐
              │  Product Detail      │               │  Product Page             │
              │  ┌────────────────┐  │               │  ┌─────────────────────┐  │
              │  │ SEO Widget     │  │               │  │ <SeoHead />         │  │
              │  │ (4 tabs)       │  │               │  │ JSON-LD scripts     │  │
              │  └────────────────┘  │               │  ├─────────────────────┤  │
              │                      │               │  │ Product Content     │  │
              │  Category Detail     │               │  ├─────────────────────┤  │
              │  ┌────────────────┐  │               │  │ <FaqSection />      │  │
              │  │ SEO Widget     │  │               │  │ <GeoSection />      │  │
              │  │ (4 tabs)       │  │               │  │ <SxoIntentLayout /> │  │
              │  └────────────────┘  │               │  └─────────────────────┘  │
              │                      │               │                           │
              │  SEO Manager Page    │               │  generateMetadata()       │
              │  ┌────────────────┐  │               │  → title, description,    │
              │  │ Static pages   │  │               │    og:*, twitter:*        │
              │  │ list + forms   │  │               └───────────────────────────┘
              │  └────────────────┘  │
              └──────────┬───────────┘
                         │
          ┌──────────────▼──────────────┐
          │   Medusa Backend (API)      │
          │                             │
          │  POST /admin/seo            │──── Zod validation middleware
          │  PUT  /admin/seo/:t/:id     │──── Zod validation middleware
          │  GET  /admin/seo/:t/:id     │──── resource_type guard
          │  GET  /admin/seo            │──── bounded limit (max 200)
          │  DELETE /admin/seo/:t/:id   │──── resource_type guard
          │  GET  /store/seo/:t/:id     │──── strips internal fields
          │                             │
          │  ┌───────────────────────┐  │
          │  │ SeoModuleService      │  │
          │  │ ├─ calculateScores()  │  │
          │  │ ├─ sanitizeFields()   │  │
          │  │ └─ upsertSeoMetadata()│  │
          │  └───────────────────────┘  │
          │              │              │
          │  ┌───────────▼───────────┐  │
          │  │ seo_metadata table    │  │
          │  │ (PostgreSQL)          │  │
          │  └───────────────────────┘  │
          └─────────────────────────────┘
```

---

## How It Works — Request Flow

The backend is a key-value store keyed on `(resource_type, resource_id)`. The **frontend page decides** which SEO to fetch by passing the slug/ID. There is no automatic discovery — each page explicitly requests its own SEO data.

### For Products and Categories (automatic)

Products and categories have Medusa-generated IDs (`prod_01...`, `pcat_...`). The frontend page already knows the entity ID from the URL/route params.

```
1. User visits:       nutrimercados.com/co/products/pasta-de-tomate
                              │
2. Next.js resolves:   products/[handle]/page.tsx
                              │
3. Page fetches:       getProductByHandle("pasta-de-tomate") → product.id = "prod_01KJ..."
                              │
4. Page calls:         getSeoMetadata("product", "prod_01KJ...")
                              │
5. Backend query:      SELECT * FROM seo_metadata
                       WHERE resource_type = 'product'
                       AND resource_id = 'prod_01KJ...'
                              │
6. Returns SEO data → page renders meta tags, JSON-LD, FAQ section, etc.
   Returns null     → page uses fallback metadata, no SEO components rendered.
```

Admin manages this via the **SEO widget** on the product/category detail page.

### For Static Pages (slug-based)

Static pages don't have Medusa IDs. Instead, we use a **slug** as the `resource_id`. The slug is **hardcoded in the frontend page file** and must match what's configured in the admin SEO Manager.

```
1. User visits:       nutrimercados.com/co/quienes-somos
                              │
2. Next.js resolves:   quienes-somos/page.tsx
                              │
3. Page calls:         getSeoMetadata("page", "quienes-somos")    ← slug hardcoded here
                              │
4. Backend query:      SELECT * FROM seo_metadata
                       WHERE resource_type = 'page'
                       AND resource_id = 'quienes-somos'
                              │
5. Returns SEO data → page renders meta tags, JSON-LD, FAQ section, etc.
   Returns null     → page uses FALLBACK_META, no SEO components rendered.
```

Admin manages this via the **SEO Manager** page in the sidebar (`/app/seo`).

### Key Concept: The Slug is the Link

The `resource_id` slug is the contract between frontend and backend:

| Where | What happens |
|-------|-------------|
| **Frontend page** | Hardcodes the slug: `getSeoMetadata("page", "quienes-somos")` |
| **Backend DB** | Stores the record with `resource_id = "quienes-somos"` |
| **Admin SEO Manager** | Shows the page entry for slug `"quienes-somos"` |

If these don't match, nothing breaks — the page just uses fallback metadata. But the SEO data configured in admin won't appear on the frontend.

### What Happens When No SEO Data Exists

Every `getSeoMetadata()` call is wrapped in try/catch. If the backend returns 404 (no SEO record) or any error:

1. `generateMetadata()` returns the `FALLBACK_META` (hardcoded title/description in the page file)
2. The page component sets `seo = null`
3. All SEO components (`SeoHead`, `FaqSection`, `GeoSection`, `SxoIntentLayout`) check `{seo && ...}` and render nothing
4. The page works exactly as before — **SEO is purely additive, never breaks the page**

---

## Four Pillars

| Pillar | Purpose | Admin Tab | Frontend Component |
|--------|---------|-----------|-------------------|
| **SEO** | Traditional search optimization: meta tags, OG/Twitter cards, structured data, sitemap, hreflang | SEO tab | `<SeoHead />` + `generateMetadata()` |
| **AEO** | Answer Engine Optimization: FAQ schema, HowTo schema, short answers for AI snippets | AEO tab | `<SeoHead />` (JSON-LD) + `<FaqSection />` |
| **GEO** | Generative Engine Optimization: entity summaries, citations, key attributes for AI crawlers | GEO tab | `<GeoSection />` |
| **SXO** | Search Experience Optimization: user intent, CTAs, internal linking, Core Web Vitals notes | SXO tab | `<SxoIntentLayout />` |

---

## Data Model

**Table**: `seo_metadata`
**Unique constraint**: `(resource_type, resource_id)`

```
src/modules/seo/models/seo-metadata.ts
```

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `id` | primary key | auto | |
| `resource_type` | text | — | `"product"`, `"category"`, or `"page"` |
| `resource_id` | text | — | Medusa entity ID or page slug |
| **SEO Fields** | | | |
| `seo_title` | text | null | Max 70 chars |
| `seo_description` | text | null | Max 160 chars |
| `seo_keywords` | json | null | `string[]` |
| `canonical_url` | text | null | Valid URL |
| `robots` | text | `"index,follow"` | |
| `og_title` | text | null | |
| `og_description` | text | null | |
| `og_image` | text | null | Valid URL |
| `og_type` | text | `"product"` | |
| `twitter_card` | text | `"summary_large_image"` | |
| `twitter_title` | text | null | |
| `twitter_description` | text | null | |
| `structured_data_type` | text | null | Schema.org type |
| `structured_data_json` | json | null | `Record<string, any>` |
| `sitemap_priority` | number | 0 | 0.0 – 1.0 |
| `sitemap_changefreq` | text | `"weekly"` | Sitemap enum |
| `hreflang_entries` | json | null | `[{lang, url}]` |
| **AEO Fields** | | | |
| `aeo_faqs` | json | null | `[{question, answer}]` |
| `aeo_howto_steps` | json | null | `[{name, text, image?}]` |
| `aeo_short_answer` | text | null | Target: 40-60 words |
| **GEO Fields** | | | |
| `geo_entity_summary` | text | null | Target: 50+ words |
| `geo_citations` | json | null | `[{source, url}]` |
| `geo_key_attributes` | json | null | `[{attribute, value}]` |
| **SXO Fields** | | | |
| `sxo_intent` | text | null | `"informational"` / `"transactional"` / `"navigational"` |
| `sxo_cta_text` | text | null | |
| `sxo_internal_links` | json | null | `[{anchor_text, target_url}]` |
| `sxo_cwv_notes` | text | null | Internal only, not exposed to storefront |
| **Scores** (auto-calculated) | | | |
| `seo_score` | number | 0 | 0–100 |
| `aeo_score` | number | 0 | 0–100 |
| `geo_score` | number | 0 | 0–100 |
| `sxo_score` | number | 0 | 0–100 |
| `created_at` | timestamp | auto | |
| `updated_at` | timestamp | auto | |
| `deleted_at` | timestamp | auto | Soft delete |

---

## Score Calculation

Scores are auto-recalculated on every create/update via `SeoModuleService.calculateScores()`.

### SEO Score (max 100)

| Condition | Points |
|-----------|--------|
| `seo_title` present and <= 70 chars | +15 |
| `seo_description` present and <= 160 chars | +15 |
| `seo_keywords` has >= 1 entry | +10 |
| `canonical_url` present | +10 |
| `og_title` + `og_description` + `og_image` all present | +15 |
| `twitter_card` + `twitter_title` + `twitter_description` all present | +10 |
| `structured_data_json` is valid non-empty object | +15 |
| `sitemap_priority` set + `sitemap_changefreq` present | +5 |
| `hreflang_entries` has >= 1 entry | +5 |

### AEO Score (max 100)

| Condition | Points |
|-----------|--------|
| `aeo_faqs` has >= 2 entries | +40 |
| `aeo_howto_steps` has >= 1 step | +30 |
| `aeo_short_answer` is 40-60 words | +30 |

### GEO Score (max 100)

| Condition | Points |
|-----------|--------|
| `geo_entity_summary` is >= 50 words | +40 |
| `geo_key_attributes` has >= 3 entries | +30 |
| `geo_citations` has >= 1 entry | +30 |

### SXO Score (max 100)

| Condition | Points |
|-----------|--------|
| `sxo_intent` is set | +25 |
| `sxo_cta_text` is present | +25 |
| `sxo_internal_links` has >= 2 entries | +25 |
| `sxo_cwv_notes` is present | +25 |

---

## Backend — Module & Service

### Module Registration

```
src/modules/seo/index.ts
```

Registered as `"seo"` module. Added to `medusa-config.ts`:

```ts
{ resolve: "./src/modules/seo" }
```

### Service (`SeoModuleService`)

```
src/modules/seo/service.ts (229 lines)
```

Extends `MedusaService({ SeoMetadata })` with constructor-based CRUD overrides (workaround for `MedusaService` not generating runtime methods for custom modules).

**Key methods:**

| Method | Description |
|--------|-------------|
| `listSeoMetadatas(filters, config)` | List records with filters |
| `listAndCountSeoMetadatas(filters, config)` | List + count for pagination |
| `retrieveSeoMetadata(id, config)` | Get by ID |
| `createSeoMetadatas(data)` | Create record |
| `updateSeoMetadatas(data)` | Update record |
| `deleteSeoMetadatas(ids)` | Delete records |
| `calculateScores(data)` | Returns `{seo_score, aeo_score, geo_score, sxo_score}` |
| `sanitizeFields(input)` | Filters input through field allowlist |
| `upsertSeoMetadata(input)` | Find-or-create + auto-calculate scores |

### Module Links

```
src/links/product-seo.ts   — product <-> seoMetadata
src/links/category-seo.ts  — productCategory <-> seoMetadata
```

---

## Backend — API Routes

### Store (Public)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/store/seo/:resource_type/:resource_id` | Public read. Strips internal fields (`sxo_cwv_notes`). |

### Admin (Authenticated)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/seo` | List all records. Pagination: `limit` (max 200), `offset`. Filter: `resource_type`. |
| POST | `/admin/seo` | Create/upsert. Validated by `PostAdminCreateSeo` Zod schema. |
| GET | `/admin/seo/:resource_type/:resource_id` | Read single record. |
| PUT | `/admin/seo/:resource_type/:resource_id` | Update. Validated by `PostAdminUpdateSeo` Zod schema. |
| DELETE | `/admin/seo/:resource_type/:resource_id` | Delete record. |

All admin/store routes validate `resource_type` against allowlist: `["product", "category", "page"]`.

---

## Backend — Validation & Middleware

```
src/api/admin/seo/validators.ts (130 lines)
src/api/middlewares.ts
```

### Zod Schemas

**`PostAdminCreateSeo`** (POST /admin/seo):
- `resource_type`: required, enum `["product", "category", "page"]`
- `resource_id`: required, string 1-200 chars
- All SEO/AEO/GEO/SXO fields: optional, nullable

**`PostAdminUpdateSeo`** (PUT /admin/seo/:t/:id):
- All SEO/AEO/GEO/SXO fields: optional, nullable

### Empty String Handling

The admin form sends empty strings `""` for unfilled fields. Validators use transform helpers:

- **`urlOrEmpty`**: `""` → `null`, then validates as URL
- **`enumOrEmpty`**: `""` → `null`, then validates against enum
- **`stringOrEmpty(max)`**: `""` → `null`, applies max length

### Field Constraints

| Type | Constraints |
|------|-------------|
| `seo_title` | max 70 chars |
| `seo_description` | max 160 chars |
| `seo_keywords` | max 20 items, each max 100 chars |
| `canonical_url`, `og_image` | valid URL, max 2000 chars |
| `sitemap_changefreq` | enum: always, hourly, daily, weekly, monthly, yearly, never |
| `sxo_intent` | enum: informational, transactional, navigational |
| `aeo_faqs` | max 20 entries, question max 500, answer max 2000 |
| `aeo_howto_steps` | max 30 steps |
| `geo_citations` | max 20 entries, valid URL required |
| `sxo_internal_links` | max 20 entries |

### Middleware Registration

```ts
// src/api/middlewares.ts
{
  matcher: "/admin/seo",
  method: "POST",
  middlewares: [validateAndTransformBody(PostAdminCreateSeo)],
},
{
  matcher: "/admin/seo/:resource_type/:resource_id",
  method: "PUT",
  middlewares: [validateAndTransformBody(PostAdminUpdateSeo)],
},
```

---

## Admin UI — Widgets

### Product SEO Widget

```
src/admin/widgets/product-seo-widget.tsx
Zone: product.details.after
```

Renders `<SeoForm resourceType="product" resourceId={product.id} />` below the product detail page.

### Category SEO Widget

```
src/admin/widgets/category-seo-widget.tsx
Zone: product_category.details.after
```

Renders `<SeoForm resourceType="category" resourceId={category.id} />` below the category detail page.

### SeoForm Component

```
src/admin/components/seo-form/index.tsx (189 lines)
```

Shared form component used by both widgets and the SEO Manager page.

- **Header**: Title + 4 color-coded score badges (green >= 80, orange >= 50, red > 0, grey = 0)
- **Tabs**: SEO | AEO | GEO | SXO
- **Actions**: "Initialize SEO" (create) or "Save" (update)
- **Callback**: Optional `onSave` prop for parent notification
- **Body sanitization**: Strips `id`, `resource_type`, `resource_id`, scores, and timestamps before sending

#### Tab Components

| Tab | File | Fields |
|-----|------|--------|
| SEO | `seo-tab.tsx` (281 lines) | Title (char counter), description (char counter), keywords (tag input), canonical URL, robots, OG fields, Twitter fields, structured data, sitemap, hreflang |
| AEO | `aeo-tab.tsx` (180 lines) | FAQ builder (add/remove rows), HowTo steps (add/remove), short answer (word counter) |
| GEO | `geo-tab.tsx` (160 lines) | Entity summary (word counter), key attributes (add/remove key-value pairs), citations (add/remove) |
| SXO | `sxo-tab.tsx` (126 lines) | Intent dropdown, CTA text, internal links (add/remove), CWV notes textarea |

---

## Admin UI — SEO Manager (Static Pages)

```
src/admin/routes/seo/page.tsx (443 lines)
Sidebar label: "SEO Manager"
Sidebar icon: Globe (lucide-react)
Route: /app/seo
```

Dedicated admin page for managing SEO of static pages that don't have a product/category detail view.

### Features

- **Predefined pages table**: 13 pages matching actual frontend routes
- **Score display**: Overall status badge + individual SEO/AEO/GEO/SXO score badges per page
- **Inline editing**: Click "Configurar SEO" → expands the `SeoForm` inline for that page
- **Custom pages**: "Agregar Pagina" button to add pages with custom slugs
- **Delete custom pages**: Removes both the UI entry and backend SEO data
- **Auto-refresh**: Scores table refreshes after each save via `onSave` callback

### Predefined Pages

| Slug | Label | Description |
|------|-------|-------------|
| `home` | Inicio | Pagina principal |
| `store` | Tienda | Listado general de productos |
| `quienes-somos` | Quienes Somos | Informacion sobre la empresa |
| `mision-vision` | Mision y Vision | Mision, vision y valores |
| `sedes` | Sedes | Ubicacion de sedes |
| `terminos-condiciones` | Terminos y Condiciones | Terminos legales |
| `tratamiento-datos` | Tratamiento de Datos | Politica de datos personales |
| `habeas-data` | Habeas Data | Derechos de proteccion de datos |
| `servicio-cliente` | Servicio al Cliente | Atencion y soporte |
| `horarios-pedidos` | Horarios de Pedidos | Horarios de atencion |
| `recetas` | Recetas | Recetas saludables |
| `dietas` | Dietas | Categorias de dietas |
| `brands` | Marcas | Listado de marcas |

### Auto-loading Custom Pages

On mount, the SEO Manager fetches all `resource_type: "page"` records from `/admin/seo?resource_type=page&limit=200`. Any record whose `resource_id` does not match a predefined slug is automatically added to the table as a custom page. This means:

- If you create a page SEO record via the API with `resource_id: "mi-pagina"`, it will appear in the SEO Manager on next load.
- Custom pages show a delete (X) button; predefined pages cannot be removed.

---

## Frontend — Data Layer

### `getSeoMetadata(resourceType, resourceId)`

```
medusapando-front/src/lib/data/seo.ts (96 lines)
```

Server-side function that fetches SEO metadata from the store API.

- **Endpoint**: `GET /store/seo/{resourceType}/{resourceId}`
- **Caching**: Uses `getCacheOptions("seo")` with `cache: "force-cache"`
- **URL safety**: `encodeURIComponent()` on both params
- **Null safety**: Returns `null` on any error (never crashes the page)
- **Array normalization**: All JSON array fields are guaranteed to be arrays (never null) via `Array.isArray()` guards
- **Object validation**: `structured_data_json` validated as non-array object

### `buildMetadata(seo, fallback)`

```
medusapando-front/src/modules/seo/utils/build-metadata.ts (89 lines)
```

Converts `SeoMetadata` into a Next.js `Metadata` object for `generateMetadata()`.

- Maps: `seo_title` → `title`, `seo_description` → `description`
- Maps: `og_*` → `openGraph`, `twitter_*` → `twitter`
- **OG type validation**: Only allows valid Next.js OpenGraph types (`website`, `article`, `book`, `profile`, `music.*`, `video.*`); defaults to `"website"`
- **Hreflang**: Mapped to `alternates.languages`
- **Robots**: Mapped to `robots` metadata
- **Keywords**: Mapped to `keywords`
- **Canonical**: Mapped to `alternates.canonical`
- Falls back to provided fallback values when SEO fields are empty

---

## Frontend — Components

### `<SeoHead />`

```
medusapando-front/src/modules/seo/components/seo-head/index.tsx (92 lines)
```

Renders JSON-LD `<script type="application/ld+json">` tags in the document.

**Generates structured data for:**
- Custom schema from `structured_data_json`
- `FAQPage` schema from `aeo_faqs`
- `HowTo` schema from `aeo_howto_steps`

**Security**: `safeJsonLd()` escapes `<` as `\u003c` to prevent `</script>` XSS injection in `dangerouslySetInnerHTML`.

### `<FaqSection />`

```
medusapando-front/src/modules/seo/components/faq-section/index.tsx (55 lines)
```

Client component ("use client") with interactive accordion. Visible content matches the JSON-LD FAQPage schema.

### `<GeoSection />`

```
medusapando-front/src/modules/seo/components/geo-section/index.tsx (87 lines)
```

Renders entity summary paragraph, key attributes as `<dl>`, and citations as external links.

**Security**: `isSafeHref()` validates all citation URLs — only `http:`, `https:`, and relative paths are rendered. Blocks `javascript:` protocol injection.

### `<SxoIntentLayout />`

```
medusapando-front/src/modules/seo/components/sxo-intent-layout/index.tsx (67 lines)
```

Renders CTA block (anchor to `#product-actions`) and internal link suggestions.

**Security**: Same `isSafeHref()` URL validation as GeoSection.

---

## Frontend — Page Integration

### Pages with SEO Integration

| Page | File | resource_type | resource_id |
|------|------|--------------|-------------|
| Homepage | `app/[countryCode]/(main)/page.tsx` | `page` | `home` |
| Store | `app/[countryCode]/(main)/store/page.tsx` | `page` | `store` |
| Quienes Somos | `app/[countryCode]/(main)/quienes-somos/page.tsx` | `page` | `quienes-somos` |
| Product Detail | `app/[countryCode]/(main)/products/[handle]/page.tsx` | `product` | `product.id` |
| Category | `app/[countryCode]/(main)/categories/[...category]/page.tsx` | `category` | `category.id` |

### Pages Pending Integration

These pages have predefined slugs in the SEO Manager but need the frontend integration pattern applied:

- `mision-vision`, `sedes`, `terminos-condiciones`, `tratamiento-datos`
- `habeas-data`, `servicio-cliente`, `horarios-pedidos`
- `recetas`, `dietas`, `brands`

---

## Security Hardening

### CRITICAL — XSS via JSON-LD

**File**: `seo-head/index.tsx`
**Risk**: `dangerouslySetInnerHTML` with `JSON.stringify()` doesn't escape `</script>` sequences.
**Fix**: `safeJsonLd()` replaces all `<` with `\u003c` before injection.

### HIGH — href Protocol Injection

**Files**: `geo-section/index.tsx`, `sxo-intent-layout/index.tsx`
**Risk**: Admin-entered URLs could contain `javascript:` protocol.
**Fix**: `isSafeHref()` validates only `http:`, `https:`, and relative (`/`) URLs are rendered.

### HIGH — No Input Validation on Admin API

**Files**: `validators.ts`, `middlewares.ts`
**Fix**: Comprehensive Zod schemas on POST and PUT routes with:
- Type validation on every field
- Max length constraints on all strings
- Array size limits (max 20-50 items)
- URL validation on URL fields
- Enum validation on constrained fields
- Empty string → null transforms for form compatibility

### MEDIUM — resource_type Injection

**Files**: All route handlers
**Fix**: `VALID_RESOURCE_TYPES` allowlist (`["product", "category", "page"]`) checked on every route.

### MEDIUM — Unbounded Query Limit

**File**: `admin/seo/route.ts`
**Fix**: `limit` clamped to `[1, 200]`, `offset` to `[0, ∞)`, with NaN fallbacks.

### MEDIUM — Score/ID Override via Body

**Files**: `admin/seo/route.ts`, `admin/seo/[resource_type]/[resource_id]/route.ts`
**Fix**: Destructure and discard `id`, `seo_score`, `aeo_score`, `geo_score`, `sxo_score`, `created_at`, `updated_at`, `deleted_at` from request body before processing.

### MEDIUM — Field Allowlist in Service

**File**: `service.ts`
**Fix**: `sanitizeFields()` method with `ALLOWED_FIELDS` Set. Only whitelisted field names pass through to create/update operations. Defense-in-depth layer.

### LOW — Internal Fields on Store API

**File**: `store/seo/[resource_type]/[resource_id]/route.ts`
**Fix**: `INTERNAL_FIELDS` array strips `sxo_cwv_notes` before returning to storefront.

### LOW — URL Path Traversal

**File**: `medusapando-front/src/lib/data/seo.ts`
**Fix**: `encodeURIComponent()` on `resourceType` and `resourceId` in fetch URL construction.

### Form Body Sanitization

**File**: `admin/components/seo-form/index.tsx`
**Fix**: Before sending, the form strips: `id`, `resource_type`, `resource_id`, `seo_score`, `aeo_score`, `geo_score`, `sxo_score`, `created_at`, `updated_at`, `deleted_at`.

---

## File Manifest

### Backend (23 files)

| # | Path | Lines | Purpose |
|---|------|-------|---------|
| 1 | `src/modules/seo/models/seo-metadata.ts` | 50 | Data model (~35 fields) |
| 2 | `src/modules/seo/service.ts` | 229 | Service: CRUD + scores + upsert + field allowlist |
| 3 | `src/modules/seo/index.ts` | 8 | Module registration (`SEO_MODULE = "seo"`) |
| 4 | `src/modules/seo/migrations/Migration20260227182008.ts` | 15 | DB migration #1 |
| 5 | `src/modules/seo/migrations/Migration20260227200000.ts` | 28 | DB migration #2 |
| 6 | `src/api/store/seo/[resource_type]/[resource_id]/route.ts` | 40 | Store GET — public read |
| 7 | `src/api/admin/seo/route.ts` | 51 | Admin GET list + POST create/upsert |
| 8 | `src/api/admin/seo/[resource_type]/[resource_id]/route.ts` | 84 | Admin GET + PUT + DELETE |
| 9 | `src/api/admin/seo/validators.ts` | 130 | Zod validation schemas |
| 10 | `src/api/middlewares.ts` | 55 | Middleware config (brands + SEO) |
| 11 | `src/admin/components/seo-form/types.ts` | 83 | TS types + default values |
| 12 | `src/admin/components/seo-form/score-badge.tsx` | 28 | Color-coded score badge |
| 13 | `src/admin/components/seo-form/seo-tab.tsx` | 281 | SEO pillar tab |
| 14 | `src/admin/components/seo-form/aeo-tab.tsx` | 180 | AEO pillar tab |
| 15 | `src/admin/components/seo-form/geo-tab.tsx` | 160 | GEO pillar tab |
| 16 | `src/admin/components/seo-form/sxo-tab.tsx` | 126 | SXO pillar tab |
| 17 | `src/admin/components/seo-form/index.tsx` | 189 | Main form: 4 tabs + scores + save |
| 18 | `src/admin/widgets/product-seo-widget.tsx` | 13 | Widget at `product.details.after` |
| 19 | `src/admin/widgets/category-seo-widget.tsx` | 15 | Widget at `product_category.details.after` |
| 20 | `src/admin/routes/seo/page.tsx` | 443 | SEO Manager page for static pages |
| 21 | `src/links/product-seo.ts` | 8 | defineLink: product <-> seoMetadata |
| 22 | `src/links/category-seo.ts` | 8 | defineLink: productCategory <-> seoMetadata |
| 23 | `medusa-config.ts` | edit | Added `{ resolve: "./src/modules/seo" }` |

### Frontend (11 files)

| # | Path | Lines | Purpose |
|---|------|-------|---------|
| 24 | `src/lib/data/seo.ts` | 96 | `getSeoMetadata()` + `SeoMetadata` type |
| 25 | `src/modules/seo/utils/build-metadata.ts` | 89 | `buildMetadata()` → Next.js Metadata |
| 26 | `src/modules/seo/components/seo-head/index.tsx` | 92 | JSON-LD scripts (FAQPage, HowTo, custom) |
| 27 | `src/modules/seo/components/faq-section/index.tsx` | 55 | FAQ accordion (client component) |
| 28 | `src/modules/seo/components/geo-section/index.tsx` | 87 | Entity summary + attributes + citations |
| 29 | `src/modules/seo/components/sxo-intent-layout/index.tsx` | 67 | CTA block + internal links |
| 30 | `app/[countryCode]/(main)/page.tsx` | 75 | Homepage — SEO integrated |
| 31 | `app/[countryCode]/(main)/store/page.tsx` | 73 | Store — SEO integrated |
| 32 | `app/[countryCode]/(main)/quienes-somos/page.tsx` | 252 | Quienes Somos — SEO integrated |
| 33 | `app/[countryCode]/(main)/products/[handle]/page.tsx` | 160 | Product detail — SEO integrated |
| 34 | `app/[countryCode]/(main)/categories/[...category]/page.tsx` | 108 | Category — SEO integrated |

**Total: 34 files, ~2,900 lines**

---

## Adding SEO to a New Page

To add SEO support to any static page:

### 1. Register the slug

Add the page slug to the predefined list in `src/admin/routes/seo/page.tsx`, OR use the "Agregar Pagina" button in the SEO Manager to create a custom entry.

### 2. Integrate the frontend page

```tsx
// Add imports
import { Metadata } from "next"
import { getSeoMetadata } from "@lib/data/seo"
import { buildMetadata } from "@modules/seo/utils/build-metadata"
import SeoHead from "@modules/seo/components/seo-head"
import FaqSection from "@modules/seo/components/faq-section"
import GeoSection from "@modules/seo/components/geo-section"
import SxoIntentLayout from "@modules/seo/components/sxo-intent-layout"

// Replace `export const metadata` with:
const FALLBACK_META = {
  title: "Your Page Title",
  description: "Your page description.",
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getSeoMetadata("page", "your-slug")
    return buildMetadata(seo, FALLBACK_META)
  } catch {
    return buildMetadata(null, FALLBACK_META)
  }
}

// Make the component async and add SEO rendering:
export default async function YourPage() {
  let seo = null
  try {
    seo = await getSeoMetadata("page", "your-slug")
  } catch {}

  return (
    <>
      {seo && <SeoHead seo={seo} />}
      {/* ... existing page content ... */}
      {seo && (
        <div className="content-container">
          <FaqSection seo={seo} />
          <GeoSection seo={seo} />
          <SxoIntentLayout seo={seo} />
        </div>
      )}
    </>
  )
}
```

### 3. Configure in admin

Go to **SEO Manager** in the admin sidebar, find your page, click **"Configurar SEO"**, fill in the desired fields, and save.

### Complete example: Adding `/ofertas` page

**Step 1 — Create the frontend page:**

```
medusapando-front/src/app/[countryCode]/(main)/ofertas/page.tsx
```

```tsx
import { Metadata } from "next"
import { getSeoMetadata } from "@lib/data/seo"
import { buildMetadata } from "@modules/seo/utils/build-metadata"
import SeoHead from "@modules/seo/components/seo-head"
import FaqSection from "@modules/seo/components/faq-section"
import GeoSection from "@modules/seo/components/geo-section"
import SxoIntentLayout from "@modules/seo/components/sxo-intent-layout"

const FALLBACK_META = {
  title: "Ofertas | Vita Integral",
  description: "Las mejores ofertas en productos saludables.",
}

export async function generateMetadata(): Promise<Metadata> {
  try {
    const seo = await getSeoMetadata("page", "ofertas")
    return buildMetadata(seo, FALLBACK_META)
  } catch {
    return buildMetadata(null, FALLBACK_META)
  }
}

export default async function OfertasPage() {
  let seo = null
  try {
    seo = await getSeoMetadata("page", "ofertas")
  } catch {}

  return (
    <>
      {seo && <SeoHead seo={seo} />}
      <div className="content-container py-12">
        <h1>Ofertas Especiales</h1>
        {/* your page content */}
      </div>
      {seo && (
        <div className="content-container">
          <FaqSection seo={seo} />
          <GeoSection seo={seo} />
          <SxoIntentLayout seo={seo} />
        </div>
      )}
    </>
  )
}
```

**Step 2 — (Optional) Add to predefined pages in SEO Manager:**

In `medusapando-back/src/admin/routes/seo/page.tsx`, add to `PREDEFINED_PAGES`:

```ts
{
  slug: "ofertas",
  label: "Ofertas",
  description: "Pagina de ofertas y promociones",
},
```

Or just use the "Agregar Pagina" button in the admin — it will auto-detect the slug on next load if you create data via the API.

**Step 3 — Deploy both frontend and backend.**

**Step 4 — In admin**, go to SEO Manager, find "ofertas", click "Configurar SEO", fill in the fields, save.

**Step 5 — Visit** `nutrimercados.com/co/ofertas` — SEO meta tags and components render automatically.

---

## Development Workflow

### Initial Setup (already done)

```bash
# Backend — module is already registered in medusa-config.ts
# Migrations are already applied
cd medusapando-back
npx medusa db:migrate

# Start backend
npx medusa develop
```

### After pulling code changes

If there are new migration files in `src/modules/seo/migrations/`:

```bash
cd medusapando-back
npx medusa db:migrate
```

### Testing SEO locally

1. Start the backend: `npx medusa develop`
2. Start the frontend: `npm run dev` (in medusapando-front)
3. Open admin: `http://localhost:9000/app`
4. Navigate to a product → scroll down to SEO widget → fill in fields → Save
5. Open the product on the frontend → View Page Source:
   - Check `<title>` and `<meta name="description">` for SEO metadata
   - Check for `<script type="application/ld+json">` for structured data
   - Check for FAQ accordion, GEO section, SXO links below the product
6. Or use `curl -s http://localhost:8000/co/products/your-handle | grep -i "ld+json"`

### Testing the Store API directly

```bash
# Fetch SEO for a product
curl http://localhost:9000/store/seo/product/prod_01KJCB4G6P8XNW0RZ443YFQ91D \
  -H "x-publishable-api-key: YOUR_KEY"

# Fetch SEO for a static page
curl http://localhost:9000/store/seo/page/home \
  -H "x-publishable-api-key: YOUR_KEY"

# Returns 404 if no SEO configured (this is normal)
```

### Testing the Admin API directly

```bash
# List all SEO records
curl http://localhost:9000/admin/seo \
  -H "Authorization: Bearer YOUR_TOKEN"

# List only page-type records
curl "http://localhost:9000/admin/seo?resource_type=page" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create/upsert SEO for a page
curl -X POST http://localhost:9000/admin/seo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "resource_type": "page",
    "resource_id": "ofertas",
    "seo_title": "Ofertas Especiales | Vita Integral",
    "seo_description": "Descubre las mejores ofertas en productos saludables."
  }'
```

### Verifying what crawlers see

1. **View Page Source** in browser (Ctrl+U) — check `<head>` for meta tags and JSON-LD
2. **Google Rich Results Test**: https://search.google.com/test/rich-results — paste the page URL
3. **Schema Markup Validator**: https://validator.schema.org/ — validate structured data
4. **curl**: `curl -s YOUR_URL | grep -E "(og:|twitter:|ld\+json|<title>|<meta name=\"description)"`

---

## Client / Production Guide

This section is for the **client team** (content managers, marketing) who will use the admin to manage SEO.

### Where to manage SEO

| Content Type | Where in Admin | How it works |
|-------------|---------------|-------------|
| **Products** | Product detail page → scroll down to "SEO / AEO / GEO / SXO" widget | Click "Initialize SEO" for new products, then fill in fields and Save |
| **Categories** | Category detail page → scroll down to "SEO / AEO / GEO / SXO" widget | Same as products |
| **Static pages** (home, about, terms, etc.) | Sidebar → **SEO Manager** | Table of all pages. Click "Configurar SEO" to expand the form |

### Step-by-step: Configure SEO for a product

1. Go to **Products** in the admin sidebar
2. Click on the product you want to optimize
3. Scroll down past the product details — you'll see the **SEO / AEO / GEO / SXO** section
4. If it says "Initialize SEO", click it to create the SEO record (you can fill fields later)
5. Fill in the fields across the 4 tabs:

#### SEO Tab (search engine basics)
- **Titulo SEO** (max 70 chars): The title shown in Google search results
- **Meta Descripcion** (max 160 chars): The snippet shown below the title in Google
- **Palabras Clave**: Add relevant keywords (comma-separated, press Enter)
- **URL Canonica**: Only if the product has duplicate URLs
- **Open Graph**: Title, description, and image for social media sharing (Facebook, WhatsApp)
- **Twitter Card**: Title and description for Twitter/X sharing
- **Datos Estructurados**: Advanced — custom JSON-LD schema
- **Sitemap**: Priority (0.0 to 1.0) and change frequency

#### AEO Tab (answer engines / AI)
- **Preguntas Frecuentes**: Add FAQ pairs (question + answer). These appear as:
  - A FAQ accordion on the product page
  - FAQPage structured data that Google/AI can use for featured snippets
  - **Tip**: Add at least 2 FAQs for the score to count
- **Pasos How-To**: If the product has usage instructions, add step-by-step guides
- **Respuesta Corta**: A 40-60 word summary that AI assistants can cite

#### GEO Tab (AI/generative engines)
- **Resumen de Entidad**: A 50+ word description of the product for AI crawlers
- **Atributos Clave**: Key-value pairs (e.g., "Origen: Colombia", "Certificacion: Organico")
  - **Tip**: Add at least 3 attributes for the score to count
- **Citaciones**: External sources that validate the product (e.g., certification bodies, studies)

#### SXO Tab (user experience)
- **Intencion de Busqueda**: Is the user looking for info, ready to buy, or navigating?
- **Texto CTA**: Call-to-action button text (e.g., "Comprar Ahora", "Ver Ingredientes")
- **Enlaces Internos**: Links to related products or categories
- **Notas CWV**: Internal notes about Core Web Vitals (not shown to users)

6. Click **Save**
7. The score badges update automatically — aim for green (>= 80) on each pillar

### Step-by-step: Configure SEO for a static page

1. Go to **SEO Manager** in the admin sidebar (Globe icon)
2. Find the page you want to optimize in the table
3. Click **"Configurar SEO"** — the form expands inline
4. Fill in the same 4 tabs as above
5. Click **Save**
6. To add a page not in the list, click **"Agregar Pagina"**, enter the slug and name

### Score guide

Each pillar scores 0-100. The badges show:

| Color | Score | Meaning |
|-------|-------|---------|
| Green | >= 80 | Excellent — well optimized |
| Orange | >= 50 | Regular — needs improvement |
| Red | > 0 | Needs work — basic fields missing |
| Grey | 0 | Not started |

**Target**: Get all 4 pillars to green (>= 80) for important pages and products.

### What the scores need

| Score | How to get 100 |
|-------|----------------|
| **SEO** | Fill: title (<=70ch), description (<=160ch), keywords, canonical URL, complete OG, complete Twitter, structured data, sitemap settings, hreflang |
| **AEO** | Add: 2+ FAQs, 1+ HowTo step, short answer (40-60 words) |
| **GEO** | Add: entity summary (50+ words), 3+ key attributes, 1+ citation |
| **SXO** | Set: search intent, CTA text, 2+ internal links, CWV notes |

### Important notes for the client

- **SEO is additive**: If no SEO data is configured, the page works normally with default metadata. Nothing breaks.
- **Products and categories**: SEO widget appears on every product/category detail page. You don't need to create anything in advance — just click "Initialize SEO" when you're ready.
- **Static pages**: Must be configured via the SEO Manager (`/app/seo`). The developer needs to integrate the frontend code for each page (see "Adding SEO to a New Page" section).
- **Changes are instant**: After saving in admin, the frontend picks up the new data on the next page load (may be cached for a few minutes).
- **Scores auto-calculate**: You don't need to manually set scores. They update every time you save.
- **Internal fields**: The "Notas CWV" field in the SXO tab is internal-only — it is never shown on the storefront, only in admin. Use it for team notes.

---

## Troubleshooting

### "Initialize SEO" button returns error 400

**Cause**: The Zod validator is rejecting the request body.

**Check**: Look at the backend logs for the specific error message. Common causes:
- A URL field has an invalid format (must be `https://...` or empty)
- A string field exceeds the max length
- An unknown field is being sent (check the form strips all read-only fields)

### SEO data saved in admin but not showing on the frontend

**Check these in order:**

1. **Slug mismatch**: The `resource_id` in the database must exactly match the slug hardcoded in the frontend page. Example: if admin saves with slug `home` but the page calls `getSeoMetadata("page", "homepage")`, it won't match.

2. **Cache**: The frontend uses `cache: "force-cache"`. Clear the Next.js cache or wait a few minutes:
   ```bash
   cd medusapando-front
   rm -rf .next/cache
   npm run build
   ```

3. **API reachable**: Test the store API directly:
   ```bash
   curl https://api.nutrimercados.com/store/seo/page/home
   ```
   If it returns 404, the record doesn't exist. If it returns data, the frontend integration may be missing.

4. **Frontend integration missing**: The page file must have the `getSeoMetadata()` call and SEO component rendering. Check the "Pages Pending Integration" list.

### Scores are all 0 even after filling in fields

The scores only update when you **save**. They're recalculated server-side on every create/update. If scores are 0 after saving, check that the data actually meets the criteria (e.g., `seo_title` must be <= 70 chars to get the 15 points).

### Product/category widget not appearing

**Check:**
- The widget files exist: `src/admin/widgets/product-seo-widget.tsx` and `category-seo-widget.tsx`
- The admin has been rebuilt: `npx medusa develop` restarts the admin build
- The widget zone is correct: `product.details.after` / `product_category.details.after`

### SEO Manager shows "Sin configurar" for a page I already configured

The SEO Manager loads data on mount. If you configured the page via the API or a different tab, just refresh the page. If it still shows "Sin configurar", verify the record exists:

```bash
curl https://api.nutrimercados.com/admin/seo/page/your-slug \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JSON-LD not appearing in page source

**Check:**
- The `SeoHead` component is rendered: `{seo && <SeoHead seo={seo} />}`
- The SEO record has at least one of: `structured_data_json`, `aeo_faqs` (2+ items), or `aeo_howto_steps` (1+ item)
- Empty arrays `[]` don't generate JSON-LD — you need actual data

### Custom page in SEO Manager disappears after refresh

Custom pages are detected from the database. If you added a custom page via the "Agregar Pagina" button but didn't save any SEO data for it, the entry only lives in the React state and is lost on refresh. To persist it, click "Configurar SEO" and save (even with empty fields — it creates the database record).
