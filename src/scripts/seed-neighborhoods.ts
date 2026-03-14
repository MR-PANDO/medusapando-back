import { ExecArgs } from "@medusajs/framework/types"
import { LOCATION_MODULE } from "../modules/location"
import LocationModuleService from "../modules/location/service"

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

/**
 * Neighborhoods (barrios/zonas) for the Area Metropolitana de Medellin.
 * Prices are delivery fees in COP (Colombian Pesos).
 * Source: Precios de Domicilios Actualizados 2026.
 *
 * Key: municipality slug → array of [name, price_cop]
 */
const NEIGHBORHOODS: Record<string, [string, number][]> = {
  // Medellín — municipality slug from seed-locations.ts
  "medellin": [
    // NORTE RUTA 1
    ["Laureles", 7000],
    ["San Juan", 7000],
    ["San Joaquín", 8000],
    ["La América", 8000],
    ["Velódromo", 7500],
    ["Florida Nueva", 7500],
    ["Los Colores", 8500],
    ["Estadio", 8000],
    ["Conquistadores", 8500],
    // NORTE RUTA 2
    ["Floresta", 8000],
    ["Santa Lucía", 8500],
    ["San Javier (Estación)", 8500],
    ["San Javier (Parte Alta)", 10000],
    ["Calasanz La 80", 9000],
    ["Calasanz Parte Alta", 10000],
    ["Carlos E. Restrepo", 9000],
    ["San Germán", 9500],
    ["Blanquizal", 10500],
    ["Robledo", 10500],
    ["Robledo Alto", 12000],
    ["Robledo Pajarito", 13000],
    // NORTE RUTA 3
    ["Santa Mónica", 8000],
    ["Simón Bolívar", 8000],
    ["Belén", 9000],
    ["La Mota", 9500],
    ["Loma de los Bernal", 9500],
    ["Rodeo Alto", 11000],
    // NORTE RUTA 4
    ["Castilla", 11000],
    ["Francisco Antonio Zea", 11000],
    ["Boyacá Las Brisas", 11500],
    ["Pedregal", 11500],
    ["Tricentenario", 11500],
    ["12 de Octubre", 12500],
    // NORTE RUTA 5
    ["Centro", 9500],
    ["Boston", 10000],
    ["Prado Centro", 10000],
    ["Salvador", 10500],
    ["Villa Hermosa", 11000],
    ["Buenos Aires", 12000],
    ["Buenos Aires Alto", 13000],
    ["Milagrosa", 10500],
    ["Aranjuez", 11500],
    ["Manrique Bajo", 11500],
    ["Manrique Alto", 12500],
    ["Chagualo", 10000],
    ["Campo Valdés", 10000],
    ["Andalucía", 13500],
    // POPULARES
    ["Santo Domingo", 14000],
    ["Popular 1 y 2", 14000],
    // SUR RUTA 1
    ["Guayabal", 9500],
    // SUR RUTA 2
    ["Poblado", 8500],
    ["La Superior (Tesoro)", 11000],
    ["Loreto", 11000],
    ["San Diego", 9500],
    ["Ciudad del Río", 8500],
    ["San Lucas", 9500],
    ["Las Palmas", 9000],
    // San Antonio de Prado (corregimiento de Medellín)
    ["San Antonio de Prado", 20000],
  ],
  // Bello — NORTE RUTA 6
  "bello": [
    ["Bello Centro", 13000],
    ["Zamora", 13000],
    ["Madera", 13000],
    ["Niquía", 14000],
  ],
  // Copacabana
  "copacabana": [
    ["Copacabana", 20000],
  ],
  // Girardota
  "girardota": [
    ["Girardota", 25000],
  ],
  // Envigado — SUR RUTA 2 & 3
  "envigado": [
    ["Envigado", 9500],
    ["Envigado Alto", 11500],
    ["Alto Palmas", 24000],
    ["Alto Escobero", 24000],
  ],
  // Sabaneta — SUR RUTA 1
  "sabaneta": [
    ["Sabaneta", 11000],
    ["Sabaneta Alto", 12000],
  ],
  // Itagüí — SUR RUTA 1
  "itagui": [
    ["Itagüí (Parque Luces)", 12000],
    ["Itagüí Alto", 13000],
  ],
  // La Estrella — SUR RUTA 1
  "la-estrella": [
    ["La Estrella", 14000],
    ["La Estrella (Tablaza)", 15000],
  ],
  // Caldas (Antioquia) — SUR RUTA 1
  // Note: slug is "caldas" since Antioquia is processed first in seed-locations.ts
  "caldas": [
    ["Caldas", 19000],
  ],
}

export default async function seedNeighborhoods({ container }: ExecArgs) {
  const locationService: LocationModuleService = container.resolve(LOCATION_MODULE)

  // Check if already seeded
  const [existing] = await locationService.listAndCountNeighborhoods({}, { take: 1 })
  if (existing.length > 0) {
    console.log("Neighborhoods already seeded, skipping...")
    return
  }

  console.log("Seeding metropolitan area neighborhoods...")

  const usedSlugs = new Set<string>()
  let totalNeighborhoods = 0

  for (const [municipalitySlug, neighborhoods] of Object.entries(NEIGHBORHOODS)) {
    // Find the municipality by slug
    const [municipalities] = await locationService.listAndCountMunicipalities(
      { slug: municipalitySlug },
      { take: 1 }
    )

    if (municipalities.length === 0) {
      console.warn(`  ⚠ Municipality "${municipalitySlug}" not found, skipping...`)
      continue
    }

    const municipality = municipalities[0]

    const records = neighborhoods.map(([name, price]) => {
      let slug = toSlug(name)
      if (usedSlugs.has(slug)) {
        slug = `${slug}-${municipalitySlug}`
      }
      usedSlugs.add(slug)
      return {
        name,
        slug,
        shipping_price: price,
        municipality_id: municipality.id,
      }
    })

    await locationService.createNeighborhoods(records)
    totalNeighborhoods += records.length
    console.log(`  ✓ ${municipality.name}: ${records.length} neighborhoods`)
  }

  console.log(`\nDone! ${totalNeighborhoods} neighborhoods seeded.`)
}
