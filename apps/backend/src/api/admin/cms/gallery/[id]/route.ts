import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("gallery_item")
export const POST = updateRecord("gallery_item")
export const DELETE = deleteRecord("gallery_item")
