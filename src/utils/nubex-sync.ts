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
  products_published: number
  products_unpublished: number
  errors: number
  error_details: string | null
  duration_ms: number
}

type ChangeEntry = {
  productId: string
  productTitle: string
  variantId: string
  variantTitle: string
  sku: string
  priceChanged: boolean
  oldPrice: number | null
  newPrice: number | null
  qtyChanged: boolean
  oldQty: number | null
  newQty: number | null
  statusChanged: boolean
  oldStatus: string | null
  newStatus: string | null
}

// Prevent concurrent syncs
let syncLock = false

/**
 * Run a full Nubex ERP → Medusa sync.
 * Updates prices (COP) and inventory quantities for all matched SKUs.
 * Publishes/unpublishes products based on stock availability.
 * Tracks per-variant changes for the admin dashboard.
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

  // Track per-variant changes
  const changes = new Map<string, ChangeEntry>()

  function getOrCreateChange(variantId: string, defaults: Partial<ChangeEntry>): ChangeEntry {
    if (!changes.has(variantId)) {
      changes.set(variantId, {
        productId: defaults.productId ?? "",
        productTitle: defaults.productTitle ?? "",
        variantId,
        variantTitle: defaults.variantTitle ?? "",
        sku: defaults.sku ?? "",
        priceChanged: false,
        oldPrice: null,
        newPrice: null,
        qtyChanged: false,
        oldQty: null,
        newQty: null,
        statusChanged: false,
        oldStatus: null,
        newStatus: null,
      })
    }
    return changes.get(variantId)!
  }

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
    products_published: 0,
    products_unpublished: 0,
    errors: 0,
  })

  let result: SyncResult = {
    total_erp_products: 0,
    matched_skus: 0,
    prices_updated: 0,
    inventory_updated: 0,
    inventory_created: 0,
    skipped_no_inventory: 0,
    products_published: 0,
    products_unpublished: 0,
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

    // 2. Query all Medusa variants with their SKUs, titles, and product info
    console.log("[NubexSync] Querying Medusa variants...")
    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: [
        "id",
        "sku",
        "title",
        "manage_inventory",
        "product.id",
        "product.title",
        "product.status",
      ],
    })

    console.log(`[NubexSync] Got ${variants.length} Medusa variants`)

    // 3. Match SKUs and collect matched variant IDs
    const matchedVariants: Array<{
      variantId: string
      sku: string
      productId: string
      productTitle: string
      variantTitle: string
    }> = []
    const priceUpdates: Array<{
      id: string
      prices: Array<{ amount: number; currency_code: string }>
    }> = []

    for (const variant of variants) {
      if (!variant.sku) continue
      const erpProduct = erpMap.get(variant.sku)
      if (!erpProduct) continue

      result.matched_skus++
      matchedVariants.push({
        variantId: variant.id,
        sku: variant.sku,
        productId: variant.product?.id,
        productTitle: variant.product?.title ?? "",
        variantTitle: variant.title ?? "",
      })

      // Price update — COP amount
      if (erpProduct.precio > 0) {
        priceUpdates.push({
          id: variant.id,
          prices: [{ amount: erpProduct.precio, currency_code: "cop" }],
        })
      }
    }

    // 3.5 Fetch current COP prices for matched variants to detect changes
    const currentPriceMap = new Map<string, number>()
    if (matchedVariants.length > 0) {
      try {
        const pricingService = container.resolve(Modules.PRICING) as any
        const variantIds = matchedVariants.map((v) => v.variantId)

        // Get variant → price_set links
        const { data: priceLinks } = await query.graph({
          entity: "product_variant_price_set",
          fields: ["variant_id", "price_set_id"],
          filters: { variant_id: variantIds },
        })

        if (priceLinks.length > 0) {
          const priceSetIds = priceLinks.map((l: any) => l.price_set_id)
          const variantByPriceSet = new Map<string, string>()
          for (const l of priceLinks) {
            variantByPriceSet.set(l.price_set_id, l.variant_id)
          }

          // Fetch money amounts for COP
          const priceSetList = await pricingService.listPriceSets(
            { id: priceSetIds },
            { relations: ["prices"] }
          )

          for (const ps of priceSetList) {
            const variantId = variantByPriceSet.get(ps.id)
            if (!variantId) continue
            const copPrice = ps.prices?.find(
              (p: any) => p.currency_code === "cop"
            )
            if (copPrice) {
              currentPriceMap.set(variantId, Number(copPrice.amount))
            }
          }
        }
        console.log(`[NubexSync] Fetched current prices for ${currentPriceMap.size} variants`)
      } catch (err: any) {
        console.warn(`[NubexSync] Could not fetch current prices: ${err.message}`)
      }
    }

    // Track price changes
    for (const mv of matchedVariants) {
      const erpProduct = erpMap.get(mv.sku)
      if (!erpProduct || erpProduct.precio <= 0) continue

      const currentPrice = currentPriceMap.get(mv.variantId) ?? null
      const newPrice = erpProduct.precio

      if (currentPrice === null || currentPrice !== newPrice) {
        const entry = getOrCreateChange(mv.variantId, {
          productId: mv.productId,
          productTitle: mv.productTitle,
          variantTitle: mv.variantTitle,
          sku: mv.sku,
        })
        entry.priceChanged = true
        entry.oldPrice = currentPrice
        entry.newPrice = newPrice
        if (currentPrice !== null) {
          console.log(
            `[NubexSync] Price change SKU ${mv.sku}: $${currentPrice} → $${newPrice}`
          )
        }
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

        for (const v of variantsNeedingInventory) {
          try {
            // a. Enable manage_inventory on this variant
            await productService.updateProductVariants(v.variantId, {
              manage_inventory: true,
            })

            // b. Find existing or create inventory item
            let inventoryItem: any
            const existing = await inventoryService.listInventoryItems(
              { sku: v.sku },
              { take: 1 }
            )
            if (existing.length > 0) {
              inventoryItem = existing[0]
            } else {
              const [created] = await inventoryService.createInventoryItems([{
                sku: v.sku,
                requires_shipping: true,
              }])
              inventoryItem = created
            }

            // c. Link inventory item to variant
            await linkService.create({
              [Modules.PRODUCT]: { variant_id: v.variantId },
              [Modules.INVENTORY]: { inventory_item_id: inventoryItem.id },
            })

            // d. Create inventory level at the stock location (if not exists)
            const erp = erpMap.get(v.sku)
            const qty = Math.max(0, Math.floor(erp?.cantidad ?? 0))
            const existingLevels = await inventoryService.listInventoryLevels({
              inventory_item_id: inventoryItem.id,
              location_id: defaultLocationId,
            })
            if (existingLevels.length === 0) {
              await inventoryService.createInventoryLevels([{
                inventory_item_id: inventoryItem.id,
                location_id: defaultLocationId,
                stocked_quantity: qty,
              }])
            } else {
              await inventoryService.updateInventoryLevels([{
                inventory_item_id: inventoryItem.id,
                location_id: defaultLocationId,
                stocked_quantity: qty,
              }])
            }

            // Track inventory creation
            const entry = getOrCreateChange(v.variantId, {
              productId: v.productId,
              productTitle: v.productTitle,
              variantTitle: v.variantTitle,
              sku: v.sku,
            })
            entry.qtyChanged = true
            entry.oldQty = 0
            entry.newQty = qty

            result.inventory_created++
          } catch (err: any) {
            result.errors++
            errorLines.push(
              `Inventory setup SKU ${v.sku}: ${err.message}`
            )
            console.error(`[NubexSync] Inventory setup error for SKU ${v.sku}:`, err.message)
          }
        }

        console.log(
          `[NubexSync] Inventory setup done: ${result.inventory_created} created, ${result.errors} errors`
        )
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

    // Map to track variant→old qty for change tracking
    const variantOldQtyMap = new Map<string, number>()
    const inventoryItemToVariantMap = new Map<string, string>()

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

        inventoryItemToVariantMap.set(link.inventory_item_id, link.variant_id)

        if (levels.length === 0) {
          // No inventory level exists — create one if we have a stock location
          if (defaultLocationId) {
            inventoryLevelCreates.push({
              inventory_item_id: link.inventory_item_id,
              location_id: defaultLocationId,
              stocked_quantity: qty,
            })
            // Track as qty change (0 → qty)
            variantOldQtyMap.set(link.variant_id, 0)
          } else {
            result.skipped_no_inventory++
          }
          continue
        }

        for (const level of levels) {
          const oldQty = Number(level.stocked_quantity)
          // Skip if quantity hasn't changed (avoid unnecessary writes)
          if (oldQty === qty) continue

          inventoryUpdates.push({
            inventory_item_id: link.inventory_item_id,
            location_id: level.location_id,
            stocked_quantity: qty,
          })

          // Track old qty for change tracking
          variantOldQtyMap.set(link.variant_id, oldQty)
        }
      }

      console.log(
        `[NubexSync] Level creates: ${inventoryLevelCreates.length}, updates: ${inventoryUpdates.length}, skipped (no location): ${result.skipped_no_inventory}`
      )
    }

    // 6. Update prices in batches
    const BATCH_SIZE = 50
    if (priceUpdates.length > 0) {
      const { updateProductVariantsWorkflow } = await import(
        "@medusajs/medusa/core-flows"
      )

      for (let i = 0; i < priceUpdates.length; i += BATCH_SIZE) {
        const batch = priceUpdates.slice(i, i + BATCH_SIZE)
        try {
          console.log(
            `[NubexSync] Updating prices batch ${i}-${i + batch.length}: ${batch.map((b) => `SKU ${matchedVariants.find((v) => v.variantId === b.id)?.sku}=$${b.prices[0].amount}`).join(", ")}`
          )
          await updateProductVariantsWorkflow(container).run({
            input: {
              product_variants: batch,
            },
          })
          result.prices_updated += batch.length
          console.log(`[NubexSync] Price batch ${i}-${i + batch.length} succeeded`)
        } catch (err: any) {
          result.errors += batch.length
          errorLines.push(
            `Price batch ${i}-${i + batch.length}: ${err.message}`
          )
          console.error(`[NubexSync] Price update batch error:`, err.message)
        }
      }
    }

    // 7. Create missing inventory levels in batches
    if (inventoryLevelCreates.length > 0) {
      const inventoryService = container.resolve(Modules.INVENTORY) as any

      for (let i = 0; i < inventoryLevelCreates.length; i += BATCH_SIZE) {
        const batch = inventoryLevelCreates.slice(i, i + BATCH_SIZE)
        try {
          await inventoryService.createInventoryLevels(batch)
          result.inventory_created += batch.length

          // Track qty changes for created levels
          for (const item of batch) {
            const variantId = inventoryItemToVariantMap.get(item.inventory_item_id)
            if (!variantId) continue
            const mv = matchedVariants.find((v) => v.variantId === variantId)
            if (!mv) continue
            const entry = getOrCreateChange(variantId, {
              productId: mv.productId,
              productTitle: mv.productTitle,
              variantTitle: mv.variantTitle,
              sku: mv.sku,
            })
            entry.qtyChanged = true
            entry.oldQty = 0
            entry.newQty = item.stocked_quantity
          }
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

    // 8. Update existing inventory levels in batches
    if (inventoryUpdates.length > 0) {
      const inventoryService = container.resolve(Modules.INVENTORY) as any

      for (let i = 0; i < inventoryUpdates.length; i += BATCH_SIZE) {
        const batch = inventoryUpdates.slice(i, i + BATCH_SIZE)
        try {
          await inventoryService.updateInventoryLevels(batch)
          result.inventory_updated += batch.length

          // Track qty changes for updated levels
          for (const item of batch) {
            const variantId = inventoryItemToVariantMap.get(item.inventory_item_id)
            if (!variantId) continue
            const mv = matchedVariants.find((v) => v.variantId === variantId)
            if (!mv) continue
            const oldQty = variantOldQtyMap.get(variantId) ?? null
            const entry = getOrCreateChange(variantId, {
              productId: mv.productId,
              productTitle: mv.productTitle,
              variantTitle: mv.variantTitle,
              sku: mv.sku,
            })
            entry.qtyChanged = true
            entry.oldQty = oldQty
            entry.newQty = item.stocked_quantity
          }
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

    // 9. Publish/unpublish products based on ERP stock
    if (matchedVariants.length > 0) {
      const productService = container.resolve(Modules.PRODUCT) as any

      // Group variants by product and check if any variant has stock
      const productStockMap = new Map<string, boolean>()
      for (const mv of matchedVariants) {
        if (!mv.productId) continue
        const erp = erpMap.get(mv.sku)
        const qty = Math.max(0, Math.floor(erp?.cantidad ?? 0))
        const hasStock = qty > 0

        // Product has stock if ANY variant has stock
        if (hasStock) {
          productStockMap.set(mv.productId, true)
        } else if (!productStockMap.has(mv.productId)) {
          productStockMap.set(mv.productId, false)
        }
      }

      // Get current product statuses to avoid unnecessary updates
      const productIds = [...productStockMap.keys()]
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "status"],
        filters: { id: productIds },
      })

      const currentStatusMap = new Map<string, string>()
      for (const p of products) {
        currentStatusMap.set(p.id, p.status)
      }

      const toPublish: string[] = []
      const toUnpublish: string[] = []

      for (const [productId, hasStock] of productStockMap) {
        const currentStatus = currentStatusMap.get(productId)
        if (hasStock && currentStatus !== "published") {
          toPublish.push(productId)
        } else if (!hasStock && currentStatus === "published") {
          toUnpublish.push(productId)
        }
      }

      // Publish products with stock
      for (const id of toPublish) {
        try {
          const oldStatus = currentStatusMap.get(id) ?? "draft"
          await productService.updateProducts(id, { status: "published" })
          result.products_published++

          // Track status change for all variants of this product
          for (const mv of matchedVariants.filter((v) => v.productId === id)) {
            const entry = getOrCreateChange(mv.variantId, {
              productId: mv.productId,
              productTitle: mv.productTitle,
              variantTitle: mv.variantTitle,
              sku: mv.sku,
            })
            entry.statusChanged = true
            entry.oldStatus = oldStatus
            entry.newStatus = "published"
          }
        } catch (err: any) {
          result.errors++
          errorLines.push(`Publish product ${id}: ${err.message}`)
          console.error(`[NubexSync] Publish error for product ${id}:`, err.message)
        }
      }

      // Unpublish products without stock
      for (const id of toUnpublish) {
        try {
          await productService.updateProducts(id, { status: "draft" })
          result.products_unpublished++

          // Track status change for all variants of this product
          for (const mv of matchedVariants.filter((v) => v.productId === id)) {
            const entry = getOrCreateChange(mv.variantId, {
              productId: mv.productId,
              productTitle: mv.productTitle,
              variantTitle: mv.variantTitle,
              sku: mv.sku,
            })
            entry.statusChanged = true
            entry.oldStatus = "published"
            entry.newStatus = "draft"
          }
        } catch (err: any) {
          result.errors++
          errorLines.push(`Unpublish product ${id}: ${err.message}`)
          console.error(`[NubexSync] Unpublish error for product ${id}:`, err.message)
        }
      }

      console.log(
        `[NubexSync] Status updates: ${result.products_published} published, ${result.products_unpublished} unpublished`
      )
    }

    // 10. Save sync details (only entries with actual changes)
    const changedEntries = [...changes.values()].filter(
      (c) => c.priceChanged || c.qtyChanged || c.statusChanged
    )

    if (changedEntries.length > 0) {
      console.log(`[NubexSync] Saving ${changedEntries.length} change details...`)
      try {
        const detailRecords = changedEntries.map((c) => ({
          sync_log_id: syncLog.id,
          product_id: c.productId,
          product_title: c.productTitle,
          variant_id: c.variantId,
          variant_title: c.variantTitle,
          sku: c.sku,
          price_changed: c.priceChanged,
          old_price: c.oldPrice,
          new_price: c.newPrice,
          qty_changed: c.qtyChanged,
          old_qty: c.oldQty,
          new_qty: c.newQty,
          status_changed: c.statusChanged,
          old_status: c.oldStatus,
          new_status: c.newStatus,
        }))

        // Save in batches
        for (let i = 0; i < detailRecords.length; i += BATCH_SIZE) {
          const batch = detailRecords.slice(i, i + BATCH_SIZE)
          await nubexService.createNubexSyncDetails(batch)
        }
      } catch (err: any) {
        console.error(`[NubexSync] Error saving sync details:`, err.message)
        errorLines.push(`Sync details save: ${err.message}`)
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
      `[NubexSync] Completed in ${result.duration_ms}ms. Prices: ${result.prices_updated}, Inventory created: ${result.inventory_created}, updated: ${result.inventory_updated}, Published: ${result.products_published}, Unpublished: ${result.products_unpublished}, Changes tracked: ${changedEntries.length}, Errors: ${result.errors}`
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
    products_published: result.products_published,
    products_unpublished: result.products_unpublished,
    errors: result.errors,
    error_details: result.error_details,
    duration_ms: result.duration_ms,
  })
}
