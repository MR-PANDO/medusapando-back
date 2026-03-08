import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import InstagramAuthProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [InstagramAuthProviderService],
})
