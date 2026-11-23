import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("banner")
export const POST = updateRecord("banner")
export const DELETE = deleteRecord("banner")
