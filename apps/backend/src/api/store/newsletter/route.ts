import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { subscribeToNewsletterWorkflow } from "../../../workflows/newsletter/subscribe-to-newsletter"

type Body = { email: string; consent: true; source?: string }

export const POST = async (req: MedusaRequest<Body>, res: MedusaResponse) => {
  const { result } = await subscribeToNewsletterWorkflow(req.scope).run({
    input: { email: req.validatedBody.email, source: req.validatedBody.source },
  })
  res.json(result)
}
