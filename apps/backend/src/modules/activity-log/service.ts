import { MedusaService } from "@medusajs/framework/utils"
import ActivityLogEntry from "./models/activity-log-entry"

class ActivityLogModuleService extends MedusaService({ ActivityLogEntry }) {}

export default ActivityLogModuleService
