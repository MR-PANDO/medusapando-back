import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type {
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/types"

/**
 * Custom fulfillment provider for local delivery in the
 * Area Metropolitana de Medellin.
 *
 * Prices are calculated based on the selected neighborhood (barrio),
 * which stores a fixed shipping_price in the neighborhood table.
 *
 * The neighborhood_id is passed via the shipping option's `data` field
 * from the frontend during price calculation.
 */
class DomiciliosFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "domicilios-medellin"

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "domicilio-metro",
        name: "Domicilio Área Metropolitana",
        is_return: false,
      },
    ]
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return true
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return { ...data }
  }

  async canCalculate(data: any): Promise<boolean> {
    return true
  }

  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<{ calculated_amount: number; is_calculated_price_tax_inclusive: boolean }> {
    const neighborhoodId = data?.neighborhood_id as string | undefined

    if (!neighborhoodId) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: true }
    }

    try {
      const { Client } = await import("pg")
      const client = new Client({
        connectionString: process.env.DATABASE_URL || "",
      })
      await client.connect()
      const result = await client.query(
        `SELECT shipping_price FROM neighborhood WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
        [neighborhoodId]
      )
      await client.end()

      if (result.rows.length > 0) {
        return {
          calculated_amount: result.rows[0].shipping_price,
          is_calculated_price_tax_inclusive: true,
        }
      }
    } catch (err: any) {
      console.error("[Domicilios] Error looking up neighborhood price:", err.message)
    }

    return { calculated_amount: 0, is_calculated_price_tax_inclusive: true }
  }

  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<CreateFulfillmentResult> {
    return {
      data: {
        ...data,
        provider: "domicilios-medellin",
      },
      labels: [],
    }
  }

  async cancelFulfillment(data: Record<string, unknown>): Promise<any> {
    return {}
  }

  async createReturnFulfillment(
    fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async getFulfillmentDocuments(data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async getReturnDocuments(data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async getShipmentDocuments(data: Record<string, unknown>): Promise<never[]> {
    return []
  }

  async retrieveDocuments(
    fulfillmentData: Record<string, unknown>,
    documentType: string
  ): Promise<void> {
    return
  }
}

export default DomiciliosFulfillmentService
