import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("review", { filterable: ["status"] })
export const POST = createRecord("review")
