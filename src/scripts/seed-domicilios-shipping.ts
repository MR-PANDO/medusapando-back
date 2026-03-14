import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Seeds the fulfillment infrastructure for local delivery (domicilios)
 * in the Area Metropolitana de Medellín.
 *
 * Creates:
 * 1. Fulfillment set linked to existing stock location
 * 2. Service zone for Colombia (country_code: "co")
 * 3. Shipping option with calculated pricing (provider: domicilios-medellin)
 * 4. Links stock location to fulfillment provider
 *
 * Idempotent: skips if a fulfillment set named "Domicilios Medellín" exists.
 */
export default async function seedDomiciliosShipping({ container }: ExecArgs) {
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT) as any
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any

  // Check if shipping option already exists
  const existingOptions = await fulfillmentModuleService.listShippingOptions({
    provider_id: "domicilios-medellin_domicilios-medellin",
  })
  if (existingOptions.length > 0) {
    console.log("Domicilios shipping option already exists, skipping...")
    return
  }

  // 1. Get or create stock location
  const stockLocations = await stockLocationService.listStockLocations({}, { take: 1 })
  let stockLocation: any

  if (stockLocations.length > 0) {
    stockLocation = stockLocations[0]
    console.log(`Using existing stock location: ${stockLocation.name} (${stockLocation.id})`)
  } else {
    throw new Error("No stock location found. Create one in Medusa Admin first.")
  }

  // 2. Link stock location to domicilios fulfillment provider
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: "domicilios-medellin_domicilios-medellin",
      },
    })
    console.log("Linked stock location to domicilios-medellin provider")
  } catch (err: any) {
    // Link might already exist
    if (!err.message?.includes("already exists")) {
      console.warn("Link creation warning:", err.message)
    }
  }

  // 3. Get or create default shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null

  if (!shippingProfile) {
    const { result: profileResult } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default Shipping Profile",
            type: "default",
          },
        ],
      },
    })
    shippingProfile = profileResult[0]
    console.log("Created default shipping profile")
  }

  // 4. Get or create fulfillment set with service zone for Colombia
  const existingSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: "Domicilios Medellín" },
    { relations: ["service_zones"] }
  )
  let fulfillmentSet: any

  if (existingSets.length > 0) {
    fulfillmentSet = existingSets[0]
    console.log(`Using existing fulfillment set: ${fulfillmentSet.id}`)
  } else {
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Domicilios Medellín",
      type: "shipping",
      service_zones: [
        {
          name: "Colombia",
          geo_zones: [
            {
              country_code: "co",
              type: "country",
            },
          ],
        },
      ],
    })
    console.log(`Created fulfillment set: ${fulfillmentSet.id}`)

    // Link fulfillment set to stock location
    await link.create({
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id,
      },
      [Modules.FULFILLMENT]: {
        fulfillment_set_id: fulfillmentSet.id,
      },
    })
    console.log("Linked fulfillment set to stock location")
  }

  // 6. Create shipping option with calculated pricing
  const serviceZoneId = fulfillmentSet.service_zones[0].id

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Domicilio Área Metropolitana",
        price_type: "calculated",
        provider_id: "domicilios-medellin_domicilios-medellin",
        service_zone_id: serviceZoneId,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Domicilio",
          description: "Entrega a domicilio en el Área Metropolitana de Medellín",
          code: "domicilio-metro",
        },
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  })
  console.log("Created shipping option: Domicilio Área Metropolitana (calculated)")

  // 7. Link sales channel to stock location (if not already linked)
  try {
    const storeService = container.resolve(Modules.STORE) as any
    const stores = await storeService.listStores({}, { take: 1 })
    if (stores.length > 0) {
      const salesChannelService = container.resolve(Modules.SALES_CHANNEL) as any
      const salesChannels = await salesChannelService.listSalesChannels({}, { take: 1 })
      if (salesChannels.length > 0) {
        await linkSalesChannelsToStockLocationWorkflow(container).run({
          input: {
            id: stockLocation.id,
            add: [salesChannels[0].id],
          },
        })
        console.log("Linked sales channel to stock location")
      }
    }
  } catch (err: any) {
    // May already be linked
    console.warn("Sales channel link warning:", err.message)
  }

  console.log("\nDone! Domicilios shipping setup complete.")
  console.log("The shipping option will appear at checkout for Colombian addresses.")
}
