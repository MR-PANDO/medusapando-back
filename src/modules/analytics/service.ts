import { MedusaService } from "@medusajs/framework/utils"
import { PageView } from "./models/page-view"

class AnalyticsModuleService extends MedusaService({
  PageView,
}) {}

export default AnalyticsModuleService
