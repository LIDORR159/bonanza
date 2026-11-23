import { deleteRecord, retrieveRecord, updateRecord } from "../../_crud"

export const GET = retrieveRecord("team_member")
export const POST = updateRecord("team_member")
export const DELETE = deleteRecord("team_member")
