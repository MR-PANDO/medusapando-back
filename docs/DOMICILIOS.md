# Domicilios - Local Delivery (Area Metropolitana de Medellin)

Zone-based shipping for the Medellin metropolitan area. Each neighborhood (barrio) has a fixed delivery price in COP. Prices are calculated dynamically based on the customer's selected zone during checkout.

## User Guide

### How it works

1. Customer selects **Antioquia** as department
2. Customer selects a **metropolitan municipality** (Medellin, Envigado, Bello, etc.)
3. A third dropdown appears: **Barrio / Zona**
4. Each zone shows its delivery price (e.g., "Laureles — $7.000")
5. The selected zone determines the shipping cost at the delivery step

### Covered municipalities

| Municipality | Zones | Price range |
|---|---|---|
| **Medellin** | ~50 barrios | $7.000 — $20.000 |
| **Envigado** | 4 zones | $9.500 — $24.000 |
| **Bello** | 4 zones | $13.000 — $14.000 |
| **Copacabana** | 1 zone | $20.000 |
| **Girardota** | 1 zone | $25.000 |
| **Sabaneta** | 2 zones | $11.000 — $12.000 |
| **Itagui** | 2 zones | $12.000 — $13.000 |
| **La Estrella** | 2 zones | $14.000 — $15.000 |
| **Caldas** | 1 zone | $19.000 |

San Antonio de Prado is listed under Medellin (it's a corregimiento).

### Non-metropolitan areas

Municipalities outside the metro area do NOT show the barrio dropdown. National shipping options (to be added later) will handle those addresses.

### Where is the barrio stored?

- **`address_2`** field on the shipping address — stores the barrio name (visible on orders)
- **Cart metadata** `neighborhood_id` — used for shipping price calculation

---

## Developer Guide

### Architecture

```
Checkout Flow:
1. User selects: Antioquia → Medellín → Laureles ($7.000)
2. Frontend stores:
   - address_2 = "Laureles" (visible on order)
   - cart.metadata.neighborhood_id = "neigh_xxxxx"
3. Shipping step: calculatePrice() called with { neighborhood_id }
4. Provider queries neighborhood table → returns $7.000
5. Shipping option shows "Domicilio Área Metropolitana — $7.000"
```

### Files

#### Backend

| File | Purpose |
|------|---------|
| `src/modules/location/models/neighborhood.ts` | Neighborhood entity (name, slug, shipping_price, municipality_id) |
| `src/modules/location/models/municipality.ts` | Updated: hasMany → Neighborhood |
| `src/modules/location/service.ts` | Updated: registered Neighborhood model |
| `src/modules/location/migrations/Migration20260314120000.ts` | Creates neighborhood table |
| `src/scripts/seed-neighborhoods.ts` | Seeds ~70 zones with prices from PDF |
| `src/api/store/locations/neighborhoods/route.ts` | `GET /store/locations/neighborhoods?municipality={slug}` |
| `src/providers/fulfillment-domicilios/index.ts` | Fulfillment provider module registration |
| `src/providers/fulfillment-domicilios/service.ts` | `DomiciliosFulfillmentService` — price calculation |
| `medusa-config.ts` | Fulfillment module with domicilios provider |

#### Frontend

| File | Purpose |
|------|---------|
| `src/modules/common/components/location-select/index.tsx` | Third dropdown for neighborhoods (metro area only) |
| `src/lib/data/locations.ts` | `getNeighborhoods(municipalitySlug)` |
| `src/app/api/locations/neighborhoods/route.ts` | API proxy |
| `src/modules/checkout/components/shipping-address/index.tsx` | Stores neighborhood_id in hidden field + address_2 |
| `src/modules/checkout/components/shipping/index.tsx` | Passes neighborhood_id to calculatePrice |
| `src/lib/data/cart.ts` | Passes address_2 + neighborhood_id to cart update |
| `src/messages/{es,en}.json` | Translation keys: neighborhood, selectNeighborhood |

### Database

**Table: `neighborhood`** (in location module)

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `name` | TEXT | Display name (e.g., "Laureles") |
| `slug` | TEXT | URL-safe slug |
| `shipping_price` | INTEGER | Delivery price in COP (e.g., 7000) |
| `municipality_id` | TEXT | FK to municipality |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| `deleted_at` | TIMESTAMPTZ | Soft delete |

### API

#### List neighborhoods

```
GET /store/locations/neighborhoods?municipality={slug}
```

**Response:**
```json
{
  "neighborhoods": [
    {
      "id": "neigh_01abc",
      "name": "Laureles",
      "slug": "laureles",
      "shipping_price": 7000,
      "municipality_id": "muni_01xyz"
    }
  ]
}
```

Returns empty array for non-metropolitan municipalities.

### Fulfillment Provider

**Provider ID:** `domicilios-medellin`

**Registered in:** `medusa-config.ts` under Fulfillment Module

**Key methods:**

- `getFulfillmentOptions()` → returns `[{ id: "domicilio-metro", name: "Domicilio Área Metropolitana" }]`
- `canCalculate()` → always returns `true` (price is dynamic)
- `calculatePrice(optionData, data, context)` → reads `data.neighborhood_id`, queries `neighborhood` table for price
- `createFulfillment()` → manual processing (no external API)

**Price calculation flow:**
1. Frontend calls `POST /store/shipping-options/{id}/calculate` with `{ cart_id, data: { neighborhood_id } }`
2. Medusa routes to provider's `calculatePrice()`
3. Provider queries DB: `SELECT shipping_price FROM neighborhood WHERE id = $1`
4. Returns `{ calculated_amount: 7000, is_calculated_price_tax_inclusive: true }`

### Metro area detection (frontend)

The `LocationSelect` component has a hardcoded set of metropolitan municipality slugs:

```typescript
const METRO_MUNICIPALITY_SLUGS = new Set([
  "medellin", "bello", "copacabana", "girardota",
  "envigado", "sabaneta", "itagui", "la-estrella", "caldas",
])
```

When the selected municipality matches, the third dropdown is rendered.

### Seed data

**Script:** `src/scripts/seed-neighborhoods.ts`

Run in production:
```bash
npx medusa exec ./src/scripts/seed-neighborhoods.js
```

The script is idempotent — skips if neighborhoods already exist. Municipality slugs must match those from `seed-locations.ts`.

### Updating prices

Currently prices are seeded. To update:
1. Modify the `shipping_price` directly in the DB
2. Or build an admin CRUD later

### Adding new zones

1. Add the entry to `seed-neighborhoods.ts`
2. Insert directly into `neighborhood` table:
```sql
INSERT INTO neighborhood (id, name, slug, shipping_price, municipality_id, created_at, updated_at)
VALUES ('neigh_custom', 'Nuevo Barrio', 'nuevo-barrio', 10000, 'muni_medellin', NOW(), NOW());
```

### Shipping option setup (Medusa Admin)

After deploying, you need to create the shipping option in Medusa Admin:

1. Go to **Settings > Locations & Shipping**
2. Create a **Fulfillment Set** linked to your stock location
3. Create a **Service Zone** with geo zone: country=CO
4. Create a **Shipping Option**:
   - Name: "Domicilio Área Metropolitana"
   - Provider: `domicilios-medellin`
   - Price type: **Calculated**
   - Shipping profile: Default
5. The provider will calculate the price based on the selected neighborhood

### Deployment

1. Deploy backend
2. Run `npx medusa db:migrate` (creates `neighborhood` table)
3. Run `npx medusa exec ./src/scripts/seed-neighborhoods.js` (seeds ~70 zones)
4. In Medusa Admin: create fulfillment set + service zone + shipping option (see above)
5. Deploy frontend

### Future: National shipping

The current setup only covers the metropolitan area. For national shipping:
- Add a second fulfillment provider (e.g., `fulfillment-envios-nacionales`)
- Use flat-rate or weight-based pricing
- Add a separate shipping option in Medusa Admin
- Both options will appear at checkout — the customer picks one

### Price reference (2026)

Source: "PRECIOS DE DOMICILIOS ACTUALIZADOS 2026"

**Medellin — Norte:**
| Zone | Price |
|------|-------|
| Laureles | $7.000 |
| San Juan | $7.000 |
| San Joaquín | $8.000 |
| La América | $8.000 |
| Velódromo | $7.500 |
| Florida Nueva | $7.500 |
| Los Colores | $8.500 |
| Estadio | $8.000 |
| Conquistadores | $8.500 |
| Floresta | $8.000 |
| Santa Lucía | $8.500 |
| San Javier (Estación) | $8.500 |
| San Javier (Parte Alta) | $10.000 |
| Calasanz La 80 | $9.000 |
| Calasanz Parte Alta | $10.000 |
| Carlos E. Restrepo | $9.000 |
| San Germán | $9.500 |
| Blanquizal | $10.500 |
| Robledo | $10.500 |
| Robledo Alto | $12.000 |
| Robledo Pajarito | $13.000 |
| Santa Mónica | $8.000 |
| Simón Bolívar | $8.000 |
| Belén | $9.000 |
| La Mota | $9.500 |
| Loma de los Bernal | $9.500 |
| Rodeo Alto | $11.000 |
| Castilla | $11.000 |
| Francisco Antonio Zea | $11.000 |
| Boyacá Las Brisas | $11.500 |
| Pedregal | $11.500 |
| Tricentenario | $11.500 |
| 12 de Octubre | $12.500 |
| Centro | $9.500 |
| Boston | $10.000 |
| Prado Centro | $10.000 |
| Salvador | $10.500 |
| Villa Hermosa | $11.000 |
| Buenos Aires | $12.000 |
| Buenos Aires Alto | $13.000 |
| Milagrosa | $10.500 |
| Aranjuez | $11.500 |
| Manrique Bajo | $11.500 |
| Manrique Alto | $12.500 |
| Chagualo | $10.000 |
| Campo Valdés | $10.000 |
| Andalucía | $13.500 |
| Santo Domingo | $14.000 |
| Popular 1 y 2 | $14.000 |

**Medellin — Sur:**
| Zone | Price |
|------|-------|
| Guayabal | $9.500 |
| Poblado | $8.500 |
| La Superior (Tesoro) | $11.000 |
| Loreto | $11.000 |
| San Diego | $9.500 |
| Ciudad del Río | $8.500 |
| San Lucas | $9.500 |
| Las Palmas | $9.000 |
| San Antonio de Prado | $20.000 |

**Bello:**
| Zone | Price |
|------|-------|
| Bello Centro | $13.000 |
| Zamora | $13.000 |
| Madera | $13.000 |
| Niquía | $14.000 |

**Copacabana:** $20.000 | **Girardota:** $25.000

**Envigado:**
| Zone | Price |
|------|-------|
| Envigado | $9.500 |
| Envigado Alto | $11.500 |
| Alto Palmas | $24.000 |
| Alto Escobero | $24.000 |

**Sabaneta:** $11.000 / Alto $12.000 | **Itagüí:** $12.000 / Alto $13.000

**La Estrella:** $14.000 / Tablaza $15.000 | **Caldas:** $19.000
