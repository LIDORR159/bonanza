import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("banner", {
  order: { placement: "ASC", rank: "ASC" },
  filterable: ["placement"],
})
export const POST = createRecord("banner")
