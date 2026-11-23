import { model } from "@medusajs/framework/utils"
import { NAVIGATION_LINK_TYPES, NAVIGATION_MENUS } from "../constants"

/**
 * One entry of the header or footer menu. Entries may be nested one level
 * through `parent_id`.
 */
const NavigationItem = model
  .define("navigation_item", {
    id: model.id({ prefix: "nav" }).primaryKey(),
    menu: model.enum([...NAVIGATION_MENUS]),
    label: model.text().translatable(),
    link_type: model.enum([...NAVIGATION_LINK_TYPES]).default("custom"),
    /** Category handle, page slug or brand handle, depending on `link_type`. */
    link_ref: model.text().nullable(),
    /** Used when `link_type` is `custom`. */
    url: model.text().nullable(),
    parent_id: model.text().nullable(),
    rank: model.number().default(0),
    is_visible: model.boolean().default(true),
    open_in_new_tab: model.boolean().default(false),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["menu", "rank"] }])

export default NavigationItem
