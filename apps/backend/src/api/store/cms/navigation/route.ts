import type { StoreNavigation } from "@bonanza/types"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { isLive, toNavigationTree } from "../../../../lib/content"
import { listLocalized } from "../../../../lib/localized"
import { CMS_MODULE } from "../../../../modules/cms"
import type CmsModuleService from "../../../../modules/cms/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms: CmsModuleService = req.scope.resolve(CMS_MODULE)
  const [items, pages] = await Promise.all([
    listLocalized(req, "navigation_item", { order: { rank: "ASC" }, take: 500 }),
    // Only slugs are needed here, and those are the same in every language.
    cms.listContentPages(
      { status: "published" },
      { select: ["slug", "status", "publish_at"], take: 500 }
    ),
  ])

  // A menu entry that points to a page nobody can open yet is left out, so the
  // menus never link to a 404.
  const livePages = new Set(pages.filter((page) => isLive(page)).map((page) => page.slug))
  const reachable = items.filter(
    (item) => item.link_type !== "page" || livePages.has(item.link_ref ?? "")
  )

  const navigation: StoreNavigation = {
    header: toNavigationTree(reachable.filter((item) => item.menu === "header")),
    footer: toNavigationTree(reachable.filter((item) => item.menu === "footer")),
  }
  res.json({ navigation })
}
