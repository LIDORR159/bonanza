import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("content_page")
export const POST = updateRecord("content_page")
export const DELETE = deleteRecord("content_page")
