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
 * Municipalities in the Area Metropolitana de Medellín.
 * These are the cities with neighborhood-based delivery (domicilios).
 * City names MUST match exactly what's stored in cart.shipping_address.city
 * (from the LocationSelect municipality name).
 */
const METRO_MUNICIPALITIES = [
  "Medellín",
  "Bello",
  "Copacabana",
  "Girardota",
  "Envigado",
  "Sabaneta",
  "Itagüí",
  "La Estrella",
  "Caldas",
]

/**
 * Seeds the complete shipping infrastructure:
 *
 * 1. "Domicilios Medellín" — calculated pricing, city-level geo zones
 *    for metro municipalities ONLY (provider: domicilios-medellin)
 *
 * 2. "Envíos Nacionales" — flat rate placeholder for rest of Colombia
 *    (provider: manual_manual, to be configured later)
 *
 * Idempotent: skips if shipping options already exist.
 */
export default async function seedDomiciliosShipping({ container }: ExecArgs) {
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT) as any
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION) as any
  const link = container.resolve(ContainerRegistrationKeys.LINK) as any

  // Check if already seeded
  const existingOptions = await fulfillmentModuleService.listShippingOptions({
    provider_id: "domicilios-medellin_domicilios-medellin",
  })
  if (existingOptions.length > 0) {
    console.log("Domicilios shipping already seeded, skipping...")
    return
  }

  // 1. Get stock location
  const stockLocations = await stockLocationService.listStockLocations({}, { take: 1 })
  if (stockLocations.length === 0) {
    throw new Error("No stock location found. Create one in Medusa Admin first.")
  }
  const stockLocation = stockLocations[0]
  console.log(`Using stock location: ${stockLocation.name} (${stockLocation.id})`)

  // 2. Link stock location to domicilios provider
  try {
    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_provider_id: "domicilios-medellin_domicilios-medellin" },
    })
    console.log("Linked stock location to domicilios-medellin provider")
  } catch (err: any) {
    console.warn("Provider link warning:", err.message)
  }

  // 3. Get or create default shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({ type: "default" })
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null
  if (!shippingProfile) {
    const { result } = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    shippingProfile = result[0]
    console.log("Created default shipping profile")
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. DOMICILIOS — City-level geo zones for metro municipalities
  // ═══════════════════════════════════════════════════════════════

  // Delete old country-level fulfillment set if it exists (from previous seed)
  const oldSets = await fulfillmentModuleService.listFulfillmentSets(
    { name: "Domicilios Medellín" },
    { relations: ["service_zones", "service_zones.geo_zones"] }
  )
  for (const old of oldSets) {
    try {
      await fulfillmentModuleService.deleteFulfillmentSets(old.id)
      console.log(`Deleted old fulfillment set: ${old.id}`)
    } catch (err: any) {
      console.warn("Could not delete old set:", err.message)
    }
  }

  // Build city-level geo zones for each metro municipality
  const metroGeoZones = METRO_MUNICIPALITIES.map((city) => ({
    type: "city" as const,
    country_code: "co",
    province_code: "antioquia",
    city,
  }))

  const domiciliosSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "Domicilios Medellín",
    type: "shipping",
    service_zones: [
      {
        name: "Área Metropolitana de Medellín",
        geo_zones: metroGeoZones,
      },
    ],
  })
  console.log(`Created fulfillment set "Domicilios Medellín": ${domiciliosSet.id}`)
  console.log(`  Service zone with ${metroGeoZones.length} city geo zones`)

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: domiciliosSet.id },
  })

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Domicilio Área Metropolitana",
        price_type: "calculated",
        provider_id: "domicilios-medellin_domicilios-medellin",
        service_zone_id: domiciliosSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Domicilio",
          description: "Entrega a domicilio en el Área Metropolitana de Medellín",
          code: "domicilio-metro",
        },
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })
  console.log("Created shipping option: Domicilio Área Metropolitana (calculated)")

  // ═══════════════════════════════════════════════════════════════
  // 5. ENVÍOS NACIONALES — Country-level for all of Colombia
  // ═══════════════════════════════════════════════════════════════

  // Check if national set already exists
  const existingNational = await fulfillmentModuleService.listFulfillmentSets({
    name: "Envíos Nacionales",
  })

  if (existingNational.length === 0) {
    const nacionalSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Envíos Nacionales",
      type: "shipping",
      service_zones: [
        {
          name: "Colombia Nacional",
          geo_zones: [
            {
              type: "country" as const,
              country_code: "co",
            },
          ],
        },
      ],
    })
    console.log(`Created fulfillment set "Envíos Nacionales": ${nacionalSet.id}`)

    await link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: nacionalSet.id },
    })

    // Create a flat-rate national shipping option (placeholder)
    await createShippingOptionsWorkflow(container).run({
      input: [
        {
          name: "Envío Nacional",
          price_type: "flat",
          provider_id: "manual_manual",
          service_zone_id: nacionalSet.service_zones[0].id,
          shipping_profile_id: shippingProfile.id,
          type: {
            label: "Envío Nacional",
            description: "Envío a cualquier ciudad de Colombia (3-5 días hábiles)",
            code: "envio-nacional",
          },
          prices: [
            { currency_code: "cop", amount: 15000 },
          ],
          rules: [
            { attribute: "enabled_in_store", value: "true", operator: "eq" },
            { attribute: "is_return", value: "false", operator: "eq" },
          ],
        },
      ],
    })
    console.log("Created shipping option: Envío Nacional (flat $15.000 COP)")
  } else {
    console.log("Envíos Nacionales already exists, skipping...")
  }

  // 6. Link sales channel to stock location
  try {
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL) as any
    const salesChannels = await salesChannelService.listSalesChannels({}, { take: 1 })
    if (salesChannels.length > 0) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocation.id, add: [salesChannels[0].id] },
      })
      console.log("Linked sales channel to stock location")
    }
  } catch (err: any) {
    console.warn("Sales channel link:", err.message)
  }

  console.log("\n══════════════════════════════════════════")
  console.log("Shipping setup complete!")
  console.log("")
  console.log("Metro area (Medellín, Bello, Envigado, etc.):")
  console.log("  → Domicilio Área Metropolitana (precio según barrio)")
  console.log("  → Envío Nacional ($15.000 COP)")
  console.log("")
  console.log("Resto de Colombia:")
  console.log("  → Envío Nacional ($15.000 COP)")
  console.log("══════════════════════════════════════════")
}
