import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("homepage_section")
export const POST = updateRecord("homepage_section")
export const DELETE = deleteRecord("homepage_section")
