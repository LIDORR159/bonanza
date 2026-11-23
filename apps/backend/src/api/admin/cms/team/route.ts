import { createRecord, listRecords } from "../_crud"

export const GET = listRecords("team_member", { filterable: ["status"] })
export const POST = createRecord("team_member")
