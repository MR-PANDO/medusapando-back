# Location Module — Colombian Departments & Municipalities

Provides cascading department → municipality selects for Colombian addresses across the storefront (account addresses, checkout shipping/billing).

---

## Architecture

### Backend (Medusa v2 Module)

```
src/modules/location/
├── models/
│   ├── department.ts       # 33 departments (32 + Bogotá D.C.)
│   └── municipality.ts     # ~1,122 municipalities (DANE DIVIPOLA)
├── service.ts              # Extends MedusaService (auto CRUD)
├── index.ts                # Module("location") export
└── migrations/
    └── Migration20260314034749.ts
```

**Entity relationships:**
- `Department` — id, name, slug (unique), timestamps
- `Municipality` — id, name, slug, department_id (FK → Department), timestamps
- `model.belongsTo()` links municipality → department

**Registered in:** `medusa-config.ts` as `{ resolve: "./src/modules/location" }`

### Store API

```
GET /store/locations                          → { departments: [...] }
GET /store/locations?department={slug}        → { municipalities: [...] }
```

- Public route (no authentication required)
- Input validation: slug must match `/^[a-z0-9-]+$/`
- Resolved via DI: `req.scope.resolve(LOCATION_MODULE)`

### Frontend

**Data layer** (`src/lib/data/locations.ts`):
- `getDepartments()` — server action, cached in memory
- `getMunicipalities(slug)` — server action, validates slug format

**API proxies** (for client-side fetching):
- `GET /api/locations/departments` → proxies to backend
- `GET /api/locations/municipalities?department={slug}` → proxies to backend

**Component** (`src/modules/common/components/location-select/index.tsx`):
- Client component with cascading `<select>` dropdowns
- Fetches departments on mount, municipalities on department change
- Auto-selects city when only one municipality exists (e.g., Bogotá D.C.)
- Props: `provinceValue`, `cityValue`, `namePrefix`, `onProvinceChange`, `onCityChange`, `required`
- Uses `useTranslations("account")` for labels

**Used in 3 forms:**
1. `src/modules/account/components/address-card/add-address.tsx` — account address creation
2. `src/modules/account/components/address-card/edit-address-modal.tsx` — account address editing
3. `src/modules/checkout/components/shipping-address/index.tsx` — checkout shipping form

**Conditional rendering:** All forms check `isColombia` (country_code === "co" or region has Colombia). When true → `<LocationSelect>`, when false → plain text inputs for province/city.

### Seed Script

`src/scripts/seed-locations.ts` — idempotent, sources from DANE DIVIPOLA data.

```bash
# Local development
npx medusa db:generate location
npx medusa db:migrate
npx medusa exec ./src/scripts/seed-locations.ts

# Production (from .medusa/server/ directory)
npx medusa db:migrate
npx medusa exec ./src/scripts/seed-locations.js   # .js extension!
```

**Data:**
- 33 departments (32 + Bogotá D.C.)
- ~1,122 municipalities
- Bogotá D.C. has a single municipality entry ("Bogotá D.C.") — localidades are not listed
- Slugs auto-generated from names; duplicates get department suffix (e.g., `villanueva-bolivar`)

---

## Translation Keys

All labels exist in both `es.json` and `en.json`:

| Key (account namespace) | ES | EN |
|---|---|---|
| `selectDepartment` | Selecciona un departamento | Select a department |
| `selectCity` | Selecciona una ciudad | Select a city |
| `loading` | Cargando... | Loading... |
| `province` | Departamento | Department |
| `city` | Ciudad | City |

---

## Security

- Backend route validates slug format with regex before querying DB
- Frontend API proxy applies same validation
- Frontend data layer validates before SDK call
- `encodeURIComponent()` on all query params in client component
- No raw user input reaches database queries

---

## Postal Code

Colombia does not use postal codes. The `postal_code` field has been removed from ALL frontend forms and displays:
- Checkout shipping address form
- Checkout billing address form
- Account address add/edit modals
- Address display cards
- Order shipping details
- Profile billing address

Medusa's `postal_code` field is optional (`z.string().nullish()`) — no backend changes needed.
