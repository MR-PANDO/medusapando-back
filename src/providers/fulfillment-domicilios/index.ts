import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import DomiciliosFulfillmentService from "./service"

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [DomiciliosFulfillmentService],
})
