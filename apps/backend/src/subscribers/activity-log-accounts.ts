import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { recordActivityWorkflow } from "../workflows/activity-log/record-activity"

type Payload = { id?: string; entity_id?: string; actor_type?: string }

/**
 * Records changes to admin accounts. The events do not say who caused them,
 * so the actor is `system`; the resource is the account that changed.
 */
export default async function activityLogAccounts({
  event,
  container,
}: SubscriberArgs<Payload>) {
  const isPasswordReset = event.name === "auth.password_reset"
  // Customer password resets are routine and are not logged.
  if (isPasswordReset && event.data.actor_type !== "user") {
    return
  }

  await recordActivityWorkflow(container).run({
    input: {
      actor_type: "system",
      action: isPasswordReset ? "user.password_reset_requested" : event.name,
      resource_type: event.name.startsWith("invite.") ? "invite" : "user",
      resource_id: event.data.id ?? null,
      summary: isPasswordReset ? (event.data.entity_id ?? null) : null,
    },
  })
}

export const config: SubscriberConfig = {
  event: [
    "user.created",
    "user.updated",
    "user.deleted",
    "invite.created",
    "invite.accepted",
    "invite.deleted",
    "auth.password_reset",
  ],
}
