# Content Translation Module

Database-driven translation system for products and categories. Spanish content lives in Medusa's native fields; other locales are stored in a custom `content_translation` table.

## Architecture

```
content_translation table
─────────────────────────
id | entity_type | entity_id | locale | title | description
UNIQUE(entity_type, entity_id, locale)
```

- **Default locale (es):** Medusa's native `product.title`, `category.name` — no lookup needed.
- **Other locales (en):** Fetched from `content_translation` and overlaid at render time.

## Table Schema

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | Auto-generated |
| `entity_type` | text | `"product"` or `"category"` |
| `entity_id` | text | Product ID or category ID |
| `locale` | text | e.g. `"en"`, `"fr"` |
| `title` | text (nullable) | Translated product title / category name |
| `description` | text (nullable) | Translated description |
| `created_at` | timestamptz | Auto |
| `updated_at` | timestamptz | Auto |
| `deleted_at` | timestamptz | Soft delete |

## Admin API

### Create/Upsert Translation
```
POST /admin/translations
Content-Type: application/json

{
  "entity_type": "product",
  "entity_id": "prod_xxx",
  "locale": "en",
  "title": "Organic Almond Butter",
  "description": "Premium organic almond butter..."
}

Response: 201
{ "translation": { id, entity_type, entity_id, locale, title, description } }
```

### Get All Translations for an Entity
```
GET /admin/translations/:entity_type/:entity_id

Response: 200
{ "translations": [{ id, locale, title, description }, ...] }
```

### Delete a Translation
```
DELETE /admin/translations/:id

Response: 200
{ "id": "...", "object": "content_translation", "deleted": true }
```

### Batch Create/Upsert
```
POST /admin/translations/batch
Content-Type: application/json

{
  "translations": [
    { "entity_type": "product", "entity_id": "prod_xxx", "locale": "en", "title": "...", "description": "..." },
    ...
  ]
}

Response: 200
{ "created": 10, "updated": 5 }
```

## Store API

### Single Entity Translation
```
GET /store/translations/:entity_type/:entity_id?locale=en

Response: 200
{ "translation": { "title": "...", "description": "..." } }
```

### Batch Translation Lookup
```
GET /store/translations/:entity_type?locale=en&entity_ids=id1,id2,id3

Response: 200
{ "translations": { "id1": { "title": "...", "description": "..." }, ... } }
```

Max 100 entity IDs per request.

## Admin Widgets

- **Product Translation Widget** — appears in product detail sidebar (`product.details.side.after`)
- **Category Translation Widget** — appears after category details (`product_category.details.after`)

Both allow selecting a locale, entering title/description, and saving.

## Frontend Integration

Server components use `getLocale()` from `next-intl/server` to determine the current locale, then call the store API to fetch translations. The translation overlay pattern:

```ts
import { getEntityTranslation } from "@lib/data/translations"
import { getLocale } from "next-intl/server"

const locale = await getLocale()
const translation = await getEntityTranslation("product", product.id, locale)

// Render with fallback
<h1>{translation?.title || product.title}</h1>
```

For lists:
```ts
import { getEntityTranslations } from "@lib/data/translations"

const translationsMap = await getEntityTranslations("product", productIds, locale)
const translation = translationsMap.get(product.id)
```

## MeiliSearch Integration

English translations are indexed alongside default fields:

- `title_en`, `description_en` — added by the transformer in `medusa-config.ts`
- Both are searchable and displayed
- The search box uses `useLocale()` to show the correct field

### Re-indexing After Translation Changes

After bulk translation changes (e.g., running the seed script), trigger a full MeiliSearch re-index:

```
POST /admin/meilisearch/sync
```

Individual translation saves via the admin widget will trigger cache revalidation via the `content-translation.updated` event subscriber.

## Seed Script

### Import File Format

Create `translations-import.json` in the backend root:

```json
{
  "products": [
    {
      "entity_id": "prod_xxx",
      "locale": "en",
      "title": "Organic Almond Butter",
      "description": "Premium organic almond butter made from..."
    }
  ],
  "categories": [
    {
      "entity_id": "pcat_xxx",
      "locale": "en",
      "title": "Supplements",
      "description": "Vitamins, minerals, and dietary supplements"
    }
  ]
}
```

### Running the Seed Script

```bash
npx medusa exec ./src/scripts/seed-translations.ts
```

After seeding, trigger MeiliSearch re-index:
```bash
curl -X POST http://localhost:9000/admin/meilisearch/sync \
  -H "Authorization: Bearer <admin-token>"
```

## Adding a New Locale

1. Add the locale to the `LOCALES` array in both admin widgets:
   - `src/admin/widgets/product-translation-widget.tsx`
   - `src/admin/widgets/category-translation-widget.tsx`

2. Add country-locale mapping in frontend `src/i18n/routing.ts`

3. Generate translations for the new locale (create `translations-import.json`)

4. Run the seed script

5. If MeiliSearch needs the new locale:
   - Add `title_{locale}` and `description_{locale}` to `indexSettings` in `medusa-config.ts`
   - Update the transformer to query for the new locale
   - Update `search-box/index.tsx` to handle the new locale
   - Trigger full re-index

## Adding a New Entity Type

1. Add the type to the `VALID_ENTITY_TYPES` in `src/api/admin/translations/validators.ts`

2. Create a new admin widget for the entity type

3. Create the store API route if needed

4. Add frontend integration following the existing pattern

## Troubleshooting

**Translations not showing on the frontend:**
- Verify the locale cookie `NEXT_LOCALE` is set correctly
- Check that the store API returns data: `GET /store/translations/product/{id}?locale=en`
- Ensure `NEXT_PUBLIC_MEDUSA_BACKEND_URL` is set correctly

**MeiliSearch not returning translated fields:**
- Verify the transformer is running: check backend logs for errors
- Trigger a full re-index: `POST /admin/meilisearch/sync`
- Check MeiliSearch settings: `GET http://meilisearch:7700/indexes/products/settings`

**Admin widget not appearing:**
- Ensure the module is registered in `medusa-config.ts`
- Run `npx medusa db:migrate` to create the table
- Restart the backend: `npx medusa develop`
