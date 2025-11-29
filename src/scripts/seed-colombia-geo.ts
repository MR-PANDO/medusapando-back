import { ExecArgs } from "@medusajs/framework/types"
import { COLOMBIA_GEO_MODULE } from "../modules/colombia-geo"
import { DEPARTAMENTOS } from "../modules/colombia-geo/data/departamentos"
import { MUNICIPIOS } from "../modules/colombia-geo/data/municipios"
import { SHIPPING_ZONES } from "../modules/colombia-geo/data/shipping-zones"

// MedusaService generates these method names based on model CLASS names:
// - Departamento -> listDepartamentoes, createDepartamentoes
// - Municipio -> listMunicipioes, createMunicipioes
// - ShippingZone -> listShippingZones, createShippingZones

export default async function seedColombiaGeo({ container }: ExecArgs) {
  const colombiaGeoService: any = container.resolve(COLOMBIA_GEO_MODULE)

  console.log("Seeding Colombia geo data...")

  // Seed Shipping Zones first
  console.log("Seeding shipping zones...")
  for (const zone of SHIPPING_ZONES) {
    try {
      const existing = await colombiaGeoService.listShippingZones({ code: zone.code })
      if (existing.length === 0) {
        await colombiaGeoService.createShippingZones(zone)
        console.log(`  Created shipping zone: ${zone.name}`)
      } else {
        console.log(`  Shipping zone already exists: ${zone.name}`)
      }
    } catch (error) {
      console.error(`  Error creating shipping zone ${zone.name}:`, error)
    }
  }

  // Seed Departamentos
  console.log("Seeding departamentos...")
  for (const depto of DEPARTAMENTOS) {
    try {
      const existing = await colombiaGeoService.listDepartamentoes({ code: depto.code })
      if (existing.length === 0) {
        await colombiaGeoService.createDepartamentoes(depto)
        console.log(`  Created departamento: ${depto.name}`)
      } else {
        console.log(`  Departamento already exists: ${depto.name}`)
      }
    } catch (error) {
      console.error(`  Error creating departamento ${depto.name}:`, error)
    }
  }

  // Seed Municipios
  console.log("Seeding municipios...")
  let municipioCount = 0
  for (const municipio of MUNICIPIOS) {
    try {
      const existing = await colombiaGeoService.listMunicipioes({ code: municipio.code })
      if (existing.length === 0) {
        await colombiaGeoService.createMunicipioes(municipio)
        municipioCount++
      }
    } catch (error) {
      console.error(`  Error creating municipio ${municipio.name}:`, error)
    }
  }
  console.log(`  Created ${municipioCount} municipios`)

  console.log("Colombia geo data seeding complete!")
  console.log(`   - ${SHIPPING_ZONES.length} shipping zones`)
  console.log(`   - ${DEPARTAMENTOS.length} departamentos`)
  console.log(`   - ${MUNICIPIOS.length} municipios`)
}
