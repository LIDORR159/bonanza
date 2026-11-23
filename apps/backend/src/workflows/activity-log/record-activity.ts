import { createWorkflow, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { recordActivityStep, type ActivityInput } from "./steps"

/** Appends one entry to the activity log. Used by subscribers. */
export const recordActivityWorkflow = createWorkflow(
  "record-activity",
  function (input: ActivityInput) {
    const entry = recordActivityStep(input)
    return new WorkflowResponse(entry)
  }
)
