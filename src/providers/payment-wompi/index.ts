import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import WompiPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [WompiPaymentProviderService],
})
