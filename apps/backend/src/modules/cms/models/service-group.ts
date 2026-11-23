import { model } from "@medusajs/framework/utils"
import { PUBLISH_STATUSES } from "../constants"
import ServiceItem from "./service-item"

/**
 * One card of the price list: haircuts, beard, packages. The list is the
 * published groups ordered by `rank`, each with its visible items.
 */
const ServiceGroup = model
  .define("service_group", {
    id: model.id({ prefix: "svcg" }).primaryKey(),
    title: model.text().translatable(),
    /** A line under the title, e.g. what the prices include. */
    note: model.text().translatable().nullable(),
    rank: model.number().default(0),
    status: model.enum([...PUBLISH_STATUSES]).default("draft"),
    updated_by: model.text().nullable(),
    items: model.hasMany(() => ServiceItem, { mappedBy: "group" }),
  })
  .cascades({ delete: ["items"] })
  .indexes([{ on: ["rank"] }])

export default ServiceGroup
