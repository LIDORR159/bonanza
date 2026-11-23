import { MedusaService } from "@medusajs/framework/utils"
import DevGatewayCharge from "./models/dev-gateway-charge"

class DevGatewayModuleService extends MedusaService({ DevGatewayCharge }) {}

export default DevGatewayModuleService
