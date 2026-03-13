import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { NUBEX_MODULE } from "../../../../../modules/nubex"
import type NubexModuleService from "../../../../../modules/nubex/service"

/**
 * GET /admin/nubex/product/:id — Get sync info for a specific product's variants
 * Returns: which SKUs matched, ERP price/qty, and last sync time
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productId = req.params.id
  const nubexService = req.scope.resolve(NUBEX_MODULE) as NubexModuleService
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY) as any

  const configured = !!process.env.NUBEX_DB_HOST

  // Get last completed sync
  const lastSync = await nubexService.getLastSync()

  // Get product variants with their SKUs
  const { data: variants } = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "title"],
    filters: { product_id: productId },
  })

  // If ERP is configured, try to match SKUs
  let erpMatches: Array<{
    variant_id: string
    variant_title: string
    sku: string
    erp_matched: boolean
    erp_price: number | null
    erp_quantity: number | null
  }> = []

  if (configured && variants.length > 0) {
    try {
      const erpProducts = await nubexService.queryErpProducts()
      const erpMap = new Map<string, { precio: number; cantidad: number }>()
      for (const p of erpProducts) {
        if (p.sku) erpMap.set(p.sku, { precio: p.precio, cantidad: p.cantidad })
      }

      erpMatches = variants.map((v: any) => {
        const erp = v.sku ? erpMap.get(v.sku) : null
        return {
          variant_id: v.id,
          variant_title: v.title || "-",
          sku: v.sku || "",
          erp_matched: !!erp,
          erp_price: erp?.precio ?? null,
          erp_quantity: erp?.cantidad ?? null,
        }
      })
    } catch {
      // ERP not reachable, just return variant info without ERP data
      erpMatches = variants.map((v: any) => ({
        variant_id: v.id,
        variant_title: v.title || "-",
        sku: v.sku || "",
        erp_matched: false,
        erp_price: null,
        erp_quantity: null,
      }))
    }
  } else {
    erpMatches = variants.map((v: any) => ({
      variant_id: v.id,
      variant_title: v.title || "-",
      sku: v.sku || "",
      erp_matched: false,
      erp_price: null,
      erp_quantity: null,
    }))
  }

  res.json({
    configured,
    last_sync: lastSync
      ? {
          status: lastSync.status,
          started_at: lastSync.started_at,
          finished_at: lastSync.finished_at,
          duration_ms: lastSync.duration_ms,
          errors: lastSync.errors,
        }
      : null,
    variants: erpMatches,
  })
}
