import { MedusaService } from "@medusajs/framework/utils"
import { Department } from "./models/department"
import { Municipality } from "./models/municipality"
import { Neighborhood } from "./models/neighborhood"

class LocationModuleService extends MedusaService({
  Department,
  Municipality,
  Neighborhood,
}) {}

export default LocationModuleService
