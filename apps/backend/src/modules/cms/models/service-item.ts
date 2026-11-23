import { model } from "@medusajs/framework/utils"
import ServiceGroup from "./service-group"

/** One line of the price list. */
const ServiceItem = model
  .define("service_item", {
    id: model.id({ prefix: "svci" }).primaryKey(),
    group: model.belongsTo(() => ServiceGroup, { mappedBy: "items" }),
    name: model.text().translatable(),
    /** One short line under the name. */
    description: model.text().translatable().nullable(),
    /** Whole shekels, VAT included. Empty shows `price_note` alone. */
    price: model.number().nullable(),
    /** Shown before the price ("from") or instead of it ("by quote"). */
    price_note: model.text().translatable().nullable(),
    duration_minutes: model.number().nullable(),
    rank: model.number().default(0),
    is_visible: model.boolean().default(true),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["group_id", "rank"] }])

export default ServiceItem
