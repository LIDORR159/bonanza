import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("content_page", {
  order: { title: "ASC" },
  filterable: ["status"],
})
export const POST = createRecord("content_page")
