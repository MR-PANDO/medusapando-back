# Venta sin Stock (Backorder)

## Overview

Allows specific products to be purchased even when inventory is at 0. Useful for products that restock daily (e.g., fresh bread, dairy, produce).

## How It Works

- Medusa has a native `allow_backorder` flag on each product variant
- When enabled, customers can add the product to cart regardless of stock level
- Stock quantity still syncs from Nubex ERP every 15 minutes — the number is accurate, but it doesn't block purchases
- The frontend already handles this flag: the "Add to Cart" button stays enabled when `allow_backorder = true`

## Admin Widget

A toggle widget appears in the **product detail sidebar** in the admin dashboard:

**Location:** Right sidebar → "Venta sin stock" section

**What it does:**
- Shows current status (Activo/Inactivo) with a badge
- Single toggle to enable/disable backorder for **all variants** of the product at once
- Displays the number of variants affected

**When to use:**
- Enable for products that restock daily and should always be available for purchase
- Leave disabled for products that should not be sold when out of stock

## API

### Toggle Backorder for All Variants

```
POST /admin/products/:id/backorder
```

**Body:**
```json
{
  "allow_backorder": true
}
```

**Response:**
```json
{
  "updated": 3
}
```

Sets `allow_backorder` on all variants of the product.

## Frontend Behavior

| State | Add to Cart | Badge |
|-------|-------------|-------|
| In stock | Enabled (green) | "Disponible" (green dot) |
| Out of stock + backorder OFF | Disabled (gray) | "Agotado" (red dot) |
| Out of stock + backorder ON | Enabled (green) | "Disponible" (green dot) |

The stock check logic in the frontend (`product-actions/index.tsx`):
```typescript
const inStock = useMemo(() => {
  if (selectedVariant && !selectedVariant.manage_inventory) return true
  if (selectedVariant?.allow_backorder) return true  // ← backorder enabled
  if (selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0) return true
  return false
}, [selectedVariant])
```

## Files

| File | Purpose |
|------|---------|
| `src/admin/widgets/product-backorder-widget.tsx` | Admin sidebar toggle widget |
| `src/api/admin/products/[id]/backorder/route.ts` | API route to update all variants |

## Nubex Sync Interaction

The Nubex sync updates stock quantities but does **not** change the `allow_backorder` flag. Products with backorder enabled will continue to be purchasable even when ERP reports 0 stock.
