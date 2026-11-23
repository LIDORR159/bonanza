import { createRecord, listRecords } from "../_crud"

/** `?group_id=` narrows the list to one group of the price list. */
export const GET = listRecords("service_item", {
  order: { group_id: "ASC", rank: "ASC" },
  filterable: ["group_id"],
})
export const POST = createRecord("service_item")
