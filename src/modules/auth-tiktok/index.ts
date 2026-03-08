import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import TikTokAuthProviderService from "./service"

export default ModuleProvider(Modules.AUTH, {
  services: [TikTokAuthProviderService],
})
