import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("navigation_item")
export const POST = updateRecord("navigation_item")
export const DELETE = deleteRecord("navigation_item")
