import {
  Modules,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import { NUBEX_MODULE } from "../modules/nubex"
import type NubexModuleService from "../modules/nubex/service"

type SyncResult = {
  total_erp_products: number
  matched_skus: number
  prices_updated: number
  inventory_updated: number
  inventory_created: number
  skipped_no_inventory: number
  errors: number
  error_details: string | null
  duration_ms: number
}

// Prevent concurrent syncs
let syncLock = false

/**
 * Run a full Nubex ERP → Medusa sync.
 * Updates prices (COP) and inventory quantities for all matched SKUs.
 */
export async function runNubexSync(
  container: any,
  trigger: "scheduled" | "manual" = "scheduled"
): Promise<SyncResult> {
  if (syncLock) {
    throw new Error("Ya hay una sincronizacion en curso. Espera a que termine.")
  }

  syncLock = true
  const nubexService = container.resolve(NUBEX_MODULE) as NubexModuleService
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as any
  const startTime = Date.now()
  const errorLines: string[] = []

  // Create sync log entry
  const syncLog = await nubexService.createNubexSyncLogs({
    status: "running",
    trigger,
    started_at: new Date(),
    total_erp_products: 0,
    matched_skus: 0,
    prices_updated: 0,
    inventory_updated: 0,
    inventory_created: 0,
    errors: 0,
  })

  let result: SyncResult = {
    total_erp_products: 0,
    matched_skus: 0,
    prices_updated: 0,
    inventory_updated: 0,
    inventory_created: 0,
    skipped_no_inventory: 0,
    errors: 0,
    error_details: null,
    duration_ms: 0,
  }

  try {
    // 1. Query ERP products
    console.log("[NubexSync] Querying ERP products...")
    const erpProducts = await nubexService.queryErpProducts()
    result.total_erp_products = erpProducts.length
    console.log(`[NubexSync] Got ${erpProducts.length} products from ERP`)

    if (erpProducts.length === 0) {
      result.duration_ms = Date.now() - startTime
      await finishLog(nubexService, syncLog.id, "completed", result)
      return result
    }

    // Build ERP lookup map by SKU
    const erpMap = new Map<string, (typeof erpProducts)[0]>()
    for (const p of erpProducts) {
      if (p.sku) erpMap.set(p.sku, p)
    }

    // 2. Query all Medusa variants with their SKUs and manage_inventory flag
    console.log("[NubexSync] Querying Medusa variants...")
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "sku", "manage_inventory"],
    })

    console.log(`[NubexSync] Got ${variants.length} Medusa variants`)

    // 3. Match SKUs and collect matched variant IDs
    const matchedVariants: Array<{ variantId: string; sku: string }> = []
    const priceUpdates: Array<{
      id: string
      prices: Array<{ amount: number; currency_code: string }>
    }> = []

    for (const variant of variants) {
      if (!variant.sku) continue
      const erpProduct = erpMap.get(variant.sku)
      if (!erpProduct) continue

      result.matched_skus++
      matchedVariants.push({ variantId: variant.id, sku: variant.sku })

      // Price update — COP amount (Nubex stores in full units, Medusa too for COP)
      if (erpProduct.precio > 0) {
        priceUpdates.push({
          id: variant.id,
          prices: [{ amount: erpProduct.precio, currency_code: "cop" }],
        })
      }
    }

    console.log(
      `[NubexSync] Matched ${result.matched_skus} SKUs. Price updates: ${priceUpdates.length}`
    )

    // 4. Resolve stock location for creating missing inventory levels
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION) as any
    let defaultLocationId: string | null = null

    try {
      const locations = await stockLocationService.listStockLocations({}, { take: 1 })
      if (locations.length > 0) {
        defaultLocationId = locations[0].id
        console.log(`[NubexSync] Using stock location: ${locations[0].name} (${defaultLocationId})`)
      }
    } catch (err: any) {
      console.warn(`[NubexSync] Could not resolve stock location: ${err.message}`)
    }

    // 4.5 Enable manage_inventory and create inventory items for variants that don't have them
    if (matchedVariants.length > 0 && defaultLocationId) {
      const variantIds = matchedVariants.map((v) => v.variantId)

      // Check which variants already have inventory item links
      const { data: existingLinks } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: ["variant_id"],
        filters: { variant_id: variantIds },
      })
      const linkedVariantIds = new Set(existingLinks.map((l: any) => l.variant_id))

      // Find variants that need inventory setup
      const variantsNeedingInventory = matchedVariants.filter(
        (v) => !linkedVariantIds.has(v.variantId)
      )

      if (variantsNeedingInventory.length > 0) {
        console.log(
          `[NubexSync] ${variantsNeedingInventory.length} variants need inventory setup`
        )

        const productService = container.resolve(Modules.PRODUCT) as any
        const inventoryService = container.resolve(Modules.INVENTORY) as any
        const linkService = container.resolve(ContainerRegistrationKeys.LINK) as any

        const SETUP_BATCH = 50
        for (let i = 0; i < variantsNeedingInventory.length; i += SETUP_BATCH) {
          const batch = variantsNeedingInventory.slice(i, i + SETUP_BATCH)
          try {
            // a. Enable manage_inventory on these variants
            await productService.updateProductVariants(
              batch.map((v) => ({ id: v.variantId, manage_inventory: true }))
            )

            // b. Create inventory items
            const inventoryItems = await inventoryService.createInventoryItems(
              batch.map((v) => ({
                sku: v.sku,
                requires_shipping: true,
              }))
            )

            // c. Link inventory items to variants
            const links = batch.map((v, idx) => ({
              [Modules.PRODUCT]: { product_variant_id: v.variantId },
              [Modules.INVENTORY]: { inventory_item_id: inventoryItems[idx].id },
            }))
            await linkService.create(links)

            // d. Create inventory levels at the stock location
            const erpQuantities = batch.map((v) => {
              const erp = erpMap.get(v.sku)
              return Math.max(0, Math.floor(erp?.cantidad ?? 0))
            })
            await inventoryService.createInventoryLevels(
              inventoryItems.map((item: any, idx: number) => ({
                inventory_item_id: item.id,
                location_id: defaultLocationId,
                stocked_quantity: erpQuantities[idx],
              }))
            )

            result.inventory_created += batch.length
            console.log(
              `[NubexSync] Inventory setup batch ${i}-${i + batch.length}: OK`
            )
          } catch (err: any) {
            result.errors += batch.length
            errorLines.push(
              `Inventory setup batch ${i}-${i + batch.length}: ${err.message}`
            )
            console.error(`[NubexSync] Inventory setup batch error:`, err.message)
          }
        }
      }
    }

    // 5. Query inventory items linked to matched variants (re-query after setup)
    const inventoryUpdates: Array<{
      inventory_item_id: string
      location_id: string
      stocked_quantity: number
    }> = []
    const inventoryLevelCreates: Array<{
      inventory_item_id: string
      location_id: string
      stocked_quantity: number
    }> = []

    if (matchedVariants.length > 0) {
      const variantIds = matchedVariants.map((v) => v.variantId)

      // Query the link between variants and inventory items
      const { data: variantInventoryLinks } = await query.graph({
        entity: "product_variant_inventory_item",
        fields: [
          "variant_id",
          "inventory_item_id",
          "inventory.id",
          "inventory.location_levels.id",
          "inventory.location_levels.location_id",
          "inventory.location_levels.stocked_quantity",
        ],
        filters: { variant_id: variantIds },
      })

      // Build variant→SKU map for lookups
      const variantSkuMap = new Map<string, string>()
      for (const mv of matchedVariants) {
        variantSkuMap.set(mv.variantId, mv.sku)
      }

      for (const link of variantInventoryLinks) {
        const sku = variantSkuMap.get(link.variant_id)
        if (!sku) continue

        const erpProduct = erpMap.get(sku)
        if (!erpProduct) continue

        const qty = Math.max(0, Math.floor(erpProduct.cantidad))
        const levels = link.inventory?.location_levels ?? []

        if (levels.length === 0) {
          // No inventory level exists — create one if we have a stock location
          if (defaultLocationId) {
            inventoryLevelCreates.push({
              inventory_item_id: link.inventory_item_id,
              location_id: defaultLocationId,
              stocked_quantity: qty,
            })
          } else {
            result.skipped_no_inventory++
          }
          continue
        }

        for (const level of levels) {
          // Skip if quantity hasn't changed (avoid unnecessary writes)
          if (Number(level.stocked_quantity) === qty) continue

          inventoryUpdates.push({
            inventory_item_id: link.inventory_item_id,
            location_id: level.location_id,
            stocked_quantity: qty,
          })
        }
      }

      console.log(
        `[NubexSync] Level creates: ${inventoryLevelCreates.length}, updates: ${inventoryUpdates.length}, skipped (no location): ${result.skipped_no_inventory}`
      )
    }

    // 5. Update prices in batches
    const BATCH_SIZE = 50
    if (priceUpdates.length > 0) {
      const { updateProductVariantsWorkflow } = await import(
        "@medusajs/medusa/core-flows"
      )

      for (let i = 0; i < priceUpdates.length; i += BATCH_SIZE) {
        const batch = priceUpdates.slice(i, i + BATCH_SIZE)
        try {
          await updateProductVariantsWorkflow(container).run({
            input: {
              product_variants: batch,
            },
          })
          result.prices_updated += batch.length
        } catch (err: any) {
          result.errors += batch.length
          errorLines.push(
            `Price batch ${i}-${i + batch.length}: ${err.message}`
          )
          console.error(`[NubexSync] Price update batch error:`, err.message)
        }
      }
    }

    // 6. Create missing inventory levels in batches (for variants that had items but no levels)
    if (inventoryLevelCreates.length > 0) {
      const inventoryService = container.resolve(Modules.INVENTORY) as any

      for (let i = 0; i < inventoryLevelCreates.length; i += BATCH_SIZE) {
        const batch = inventoryLevelCreates.slice(i, i + BATCH_SIZE)
        try {
          await inventoryService.createInventoryLevels(batch)
          result.inventory_created += batch.length
        } catch (err: any) {
          result.errors += batch.length
          errorLines.push(
            `Inventory create batch ${i}-${i + batch.length}: ${err.message}`
          )
          console.error(
            `[NubexSync] Inventory create batch error:`,
            err.message
          )
        }
      }
    }

    // 7. Update existing inventory levels in batches
    if (inventoryUpdates.length > 0) {
      const inventoryService = container.resolve(Modules.INVENTORY) as any

      for (let i = 0; i < inventoryUpdates.length; i += BATCH_SIZE) {
        const batch = inventoryUpdates.slice(i, i + BATCH_SIZE)
        try {
          await inventoryService.updateInventoryLevels(batch)
          result.inventory_updated += batch.length
        } catch (err: any) {
          result.errors += batch.length
          errorLines.push(
            `Inventory update batch ${i}-${i + batch.length}: ${err.message}`
          )
          console.error(
            `[NubexSync] Inventory update batch error:`,
            err.message
          )
        }
      }
    }

    result.duration_ms = Date.now() - startTime
    result.error_details =
      errorLines.length > 0 ? errorLines.join("\n") : null

    await finishLog(
      nubexService,
      syncLog.id,
      result.errors > 0 ? "completed" : "completed",
      result
    )

    console.log(
      `[NubexSync] Completed in ${result.duration_ms}ms. Prices: ${result.prices_updated}, Inventory created: ${result.inventory_created}, updated: ${result.inventory_updated}, Errors: ${result.errors}`
    )

    return result
  } catch (err: any) {
    result.duration_ms = Date.now() - startTime
    result.error_details = err.message ?? String(err)

    try {
      await finishLog(nubexService, syncLog.id, "failed", result)
    } catch {}

    console.error("[NubexSync] Sync failed:", err.message)
    throw err
  } finally {
    syncLock = false
  }
}

async function finishLog(
  nubexService: NubexModuleService,
  id: string,
  status: "running" | "completed" | "failed",
  result: SyncResult
) {
  await nubexService.updateNubexSyncLogs({
    id,
    status,
    finished_at: new Date(),
    total_erp_products: result.total_erp_products,
    matched_skus: result.matched_skus,
    prices_updated: result.prices_updated,
    inventory_updated: result.inventory_updated,
    inventory_created: result.inventory_created,
    errors: result.errors,
    error_details: result.error_details,
    duration_ms: result.duration_ms,
  })
}
