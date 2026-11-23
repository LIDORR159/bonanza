import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("service_group", { filterable: ["status"] })
export const POST = createRecord("service_group")
