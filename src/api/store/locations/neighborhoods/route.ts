import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { LOCATION_MODULE } from "../../../../modules/location"
import LocationModuleService from "../../../../modules/location/service"

export const AUTHENTICATE = false

/**
 * GET /store/locations/neighborhoods?municipality={slug}
 * Returns neighborhoods (barrios) with shipping prices for a municipality.
 * Only metropolitan area municipalities have neighborhoods.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const locationService: LocationModuleService = req.scope.resolve(LOCATION_MODULE)

  const municipalitySlug = req.query.municipality as string | undefined

  if (!municipalitySlug) {
    return res.json({ neighborhoods: [] })
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(municipalitySlug)) {
    return res.status(400).json({ message: "Invalid municipality slug" })
  }

  // Find municipality
  const [municipalities] = await locationService.listAndCountMunicipalities(
    { slug: municipalitySlug },
    { take: 1 }
  )

  if (!municipalities.length) {
    return res.json({ neighborhoods: [] })
  }

  // Get neighborhoods for this municipality
  const [neighborhoods] = await locationService.listAndCountNeighborhoods(
    { municipality_id: municipalities[0].id },
    { take: 200, order: { name: "ASC" } }
  )

  res.json({ neighborhoods })
}
