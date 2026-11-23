import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("service_item")
export const POST = updateRecord("service_item")
export const DELETE = deleteRecord("service_item")
