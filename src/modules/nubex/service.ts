import { MedusaService } from "@medusajs/framework/utils"
import { NubexSyncLog } from "./models/nubex-sync-log"
import { NubexSyncDetail } from "./models/nubex-sync-detail"
import { NubexSettings } from "./models/nubex-settings"

export type NubexProduct = {
  sku: string
  codigo_barras: string | null
  nombre: string
  sucursal: number | null
  cantidad: number
  precio: number
}

class NubexModuleService extends MedusaService({
  NubexSyncLog,
  NubexSyncDetail,
  NubexSettings,
}) {
  /**
   * Query all active products from Nubex ERP (SQL Server).
   * Uses parameterized queries to prevent SQL injection.
   */
  async queryErpProducts(): Promise<NubexProduct[]> {
    if (!process.env.NUBEX_DB_HOST || !process.env.NUBEX_DB_USER || !process.env.NUBEX_DB_PASSWORD) {
      throw new Error("Nubex ERP: faltan credenciales (NUBEX_DB_HOST, NUBEX_DB_USER, NUBEX_DB_PASSWORD)")
    }

    const sql = await import("mssql")

    const config: any = {
      server: process.env.NUBEX_DB_HOST,
      port: Number(process.env.NUBEX_DB_PORT) || 1433,
      user: process.env.NUBEX_DB_USER,
      password: process.env.NUBEX_DB_PASSWORD,
      database: process.env.NUBEX_DB_NAME || "xpunto",
      options: {
        encrypt: false,
        trustServerCertificate: true,
      },
      connectionTimeout: 15000,
      requestTimeout: 30000,
    }

    const sucursal = Number(process.env.NUBEX_SUCURSAL) || 3

    let pool: any = null

    try {
      pool = await sql.default.connect(config)

      const result = await pool
        .request()
        .input("sucursal", sql.default.Int, sucursal)
        .query(`
          SELECT
            p.codigo AS sku,
            p.barras AS codigo_barras,
            RTRIM(r.nombrevta + ' ' + ISNULL(dd.nombre, '') + ' ' + ISNULL(ds.nombre, '')) AS nombre,
            e.codsucursal AS sucursal,
            ISNULL(e.cantidad, 0) AS cantidad,
            ISNULL(pr.lista1, 0) AS precio
          FROM dbo.tbproductos AS p
          INNER JOIN dbo.tbreferencias AS r ON p.codigo_ref = r.codigo
          LEFT OUTER JOIN dbo.tbdetdivision AS dd ON p.codigo_detdiv = dd.codigo
          LEFT OUTER JOIN dbo.tbdetsubdivicion AS ds ON p.codigo_detsubdiv = ds.codigo
          LEFT OUTER JOIN dbo.tbprecios AS pr ON p.codigo = pr.codigo_prod
          LEFT OUTER JOIN dbo.vw_existencias_ultima AS e
            ON p.codigo = e.codproducto AND e.rn = 1 AND e.codsucursal = @sucursal
          WHERE (p.activo = 1) AND (r.activo = 1) AND (r.escombo = 0)
        `)

      // Validate and sanitize ERP data
      const products: NubexProduct[] = []
      for (const row of result.recordset) {
        const sku = row.sku != null ? String(row.sku).trim() : ""
        if (!sku) continue // Skip products without SKU

        const precio = Number(row.precio)
        const cantidad = Number(row.cantidad)

        // Skip rows with invalid numeric data
        if (isNaN(precio) || isNaN(cantidad)) continue

        products.push({
          sku,
          codigo_barras: row.codigo_barras ? String(row.codigo_barras).trim() : null,
          nombre: row.nombre ? String(row.nombre).trim() : "",
          sucursal: row.sucursal != null ? Number(row.sucursal) : null,
          cantidad: Math.max(0, Math.floor(cantidad)), // No negatives, integer only
          precio: Math.max(0, precio), // No negative prices
        })
      }

      return products
    } finally {
      if (pool) {
        try {
          await pool.close()
        } catch {}
      }
    }
  }

  /**
   * Get the last sync log entry.
   */
  async getLastSync() {
    const [records] = await this.listAndCountNubexSyncLogs(
      {},
      { take: 1, order: { started_at: "DESC" } }
    )
    return records[0] ?? null
  }

  /**
   * Get recent sync logs.
   */
  async getRecentSyncs(limit = 10) {
    const [records] = await this.listAndCountNubexSyncLogs(
      {},
      { take: limit, order: { started_at: "DESC" } }
    )
    return records
  }

  /**
   * Get Nubex low-stock notification settings.
   */
  async getNubexSettings(): Promise<{
    low_stock_threshold: number
    notification_email: string | null
    low_stock_enabled: boolean
  } | null> {
    const [records] = await this.listAndCountNubexSettings(
      {},
      { take: 1, order: { created_at: "DESC" } }
    )
    if (records.length === 0) return null
    const r = records[0] as any
    return {
      low_stock_threshold: r.low_stock_threshold,
      notification_email: r.notification_email ?? null,
      low_stock_enabled: r.low_stock_enabled,
    }
  }

  /**
   * Create or update Nubex settings (single row).
   */
  async upsertNubexSettings(data: {
    low_stock_threshold: number
    notification_email: string | null
    low_stock_enabled: boolean
  }) {
    const [existing] = await this.listAndCountNubexSettings({}, { take: 1 })
    if (existing.length > 0) {
      return this.updateNubexSettings({
        id: (existing[0] as any).id,
        ...data,
      })
    }
    return this.createNubexSettings(data)
  }
}

export default NubexModuleService
