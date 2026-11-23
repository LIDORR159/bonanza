import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../modules/cms"
import type CmsModuleService from "../../modules/cms/service"

type Input = { email: string; source?: string | null }

/** What the step changed, so a failed workflow can put it back. */
type Undo = { created_id: string | null; resubscribed_id: string | null }
const nothing: Undo = { created_id: null, resubscribed_id: null }

const subscribeToNewsletterStep = createStep(
  "subscribe-to-newsletter",
  async (input: Input, { container }) => {
    const cms: CmsModuleService = container.resolve(CMS_MODULE)
    const email = input.email.trim().toLowerCase()
    const [existing] = await cms.listNewsletterSubscribers({ email }, { take: 1 })

    if (!existing) {
      const created = await cms.createNewsletterSubscribers({
        email,
        source: input.source ?? null,
        consented_at: new Date(),
      })
      return new StepResponse(
        { status: "subscribed" as const },
        { ...nothing, created_id: created.id }
      )
    }

    if (existing.status === "unsubscribed") {
      await cms.updateNewsletterSubscribers({
        id: existing.id,
        status: "subscribed",
        consented_at: new Date(),
      })
      return new StepResponse(
        { status: "subscribed" as const },
        { ...nothing, resubscribed_id: existing.id }
      )
    }

    // Already subscribed: nothing to change, and nothing to undo.
    return new StepResponse({ status: "subscribed" as const }, nothing)
  },
  async (undo: Undo | undefined, { container }) => {
    if (!undo) {
      return
    }
    const cms: CmsModuleService = container.resolve(CMS_MODULE)
    if (undo.created_id) {
      await cms.deleteNewsletterSubscribers(undo.created_id)
    }
    if (undo.resubscribed_id) {
      await cms.updateNewsletterSubscribers({
        id: undo.resubscribed_id,
        status: "unsubscribed",
      })
    }
  }
)

/**
 * Adds an email to the newsletter list. The result is the same whether or not
 * the address was already on the list, so the endpoint cannot be used to find
 * out who has subscribed.
 */
export const subscribeToNewsletterWorkflow = createWorkflow(
  "subscribe-to-newsletter",
  function (input: Input) {
    const result = subscribeToNewsletterStep(input)
    return new WorkflowResponse(result)
  }
)
