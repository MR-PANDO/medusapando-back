import { MedusaService } from "@medusajs/framework/utils"
import { Department } from "./models/department"
import { Municipality } from "./models/municipality"

class LocationModuleService extends MedusaService({
  Department,
  Municipality,
}) {}

export default LocationModuleService
