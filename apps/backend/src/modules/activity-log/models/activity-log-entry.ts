import { model } from "@medusajs/framework/utils"

/**
 * One recorded admin action: who did what to which record. Entries are only
 * ever appended.
 */
const ActivityLogEntry = model
  .define("activity_log_entry", {
    id: model.id({ prefix: "actlog" }).primaryKey(),
    /** `user`, `customer` or `system`. */
    actor_type: model.text().default("system"),
    actor_id: model.text().nullable(),
    /** Dotted verb, e.g. `cms.banner.updated`. */
    action: model.text(),
    resource_type: model.text(),
    resource_id: model.text().nullable(),
    /** Short human-readable description, e.g. the record's title. */
    summary: model.text().nullable(),
    /** Changed field names and other non-sensitive context. Never full bodies. */
    details: model.json().nullable(),
  })
  .indexes([{ on: ["resource_type", "resource_id"] }, { on: ["actor_id"] }])

export default ActivityLogEntry
