import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("navigation_item", {
  order: { menu: "ASC", rank: "ASC" },
  filterable: ["menu"],
})
export const POST = createRecord("navigation_item")
