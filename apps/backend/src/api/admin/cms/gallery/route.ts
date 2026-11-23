import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("gallery_item", { filterable: ["status"] })
export const POST = createRecord("gallery_item")
