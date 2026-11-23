import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("service_group")
export const POST = updateRecord("service_group")
export const DELETE = deleteRecord("service_group")
