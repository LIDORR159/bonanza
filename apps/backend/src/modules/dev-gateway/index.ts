import { Module } from "@medusajs/framework/utils"
import DevGatewayModuleService from "./service"

/**
 * A simulated external payment gateway: hosted payment page, REST API and
 * signed webhooks. Development and staging only; `medusa-config.ts` registers
 * it only when PAYMENT_DEV_ENABLED=true and APP_ENV is not production.
 */
export const DEV_GATEWAY_MODULE = "dev_gateway"

export default Module(DEV_GATEWAY_MODULE, { service: DevGatewayModuleService })
