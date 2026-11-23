import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("review")
export const POST = updateRecord("review")
export const DELETE = deleteRecord("review")
