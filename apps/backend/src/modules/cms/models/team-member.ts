import { model } from "@medusajs/framework/utils"
import { PUBLISH_STATUSES } from "../constants"

/** A barber shown on the gallery page, with a link to their Instagram. */
const TeamMember = model
  .define("team_member", {
    id: model.id({ prefix: "team" }).primaryKey(),
    name: model.text().translatable(),
    role: model.text().translatable().nullable(),
    photo_url: model.text().nullable(),
    instagram_url: model.text().nullable(),
    rank: model.number().default(0),
    status: model.enum([...PUBLISH_STATUSES]).default("draft"),
    updated_by: model.text().nullable(),
  })
  .indexes([{ on: ["rank"] }])

export default TeamMember
