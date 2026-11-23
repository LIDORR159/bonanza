import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("homepage_section")
export const POST = createRecord("homepage_section")
