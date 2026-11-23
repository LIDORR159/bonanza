import { ModuleProvider, Modules } from "@medusajs/framework/utils"
import DevHostedPaymentProviderService from "./service"

export default ModuleProvider(Modules.PAYMENT, {
  services: [DevHostedPaymentProviderService],
})
