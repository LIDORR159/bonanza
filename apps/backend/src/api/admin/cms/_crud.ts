import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CMS_MODULE } from "../../../modules/cms"
import { deleteCmsRecordWorkflow } from "../../../workflows/cms/delete-cms-record"
import { CMS_ENTITIES, type CmsEntity } from "../../../workflows/cms/entities"
import { reorderCmsRecordsWorkflow } from "../../../workflows/cms/reorder-cms-records"
import { saveCmsRecordWorkflow } from "../../../workflows/cms/save-cms-record"

/**
 * Handlers shared by the content admin routes. Each route file picks the ones
 * it needs and names the record it serves.
 */

type CmsMethods = Record<string, (...args: any[]) => Promise<any>>
type Row = Record<string, unknown>

/** The JSON keys each record type is returned under. */
const RESPONSE_KEYS: Record<CmsEntity, { one: string; many: string }> = {
  homepage_section: { one: "section", many: "sections" },
  banner: { one: "banner", many: "banners" },
  content_page: { one: "page", many: "pages" },
  navigation_item: { one: "item", many: "items" },
  site_setting: { one: "settings", many: "settings" },
  service_group: { one: "service_group", many: "service_groups" },
  service_item: { one: "service_item", many: "service_items" },
  gallery_item: { one: "gallery_item", many: "gallery_items" },
  team_member: { one: "team_member", many: "team_members" },
  review: { one: "review", many: "reviews" },
}

/** A field that must be unique among records that are not deleted. */
const UNIQUE_FIELD: Partial<Record<CmsEntity, string>> = {
  homepage_section: "key",
  content_page: "slug",
}

/** A field that must name an existing record of another type. */
const PARENT: Partial<Record<CmsEntity, { field: string; entity: CmsEntity }>> = {
  service_item: { field: "group_id", entity: "service_group" },
}

const cmsOf = (req: MedusaRequest) => req.scope.resolve(CMS_MODULE) as unknown as CmsMethods

export function pagination(query: Record<string, unknown>, defaultLimit = 100) {
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), 200)
  const offset = Math.max(Number(query.offset) || 0, 0)
  return { limit, offset }
}

async function assertUnique(req: MedusaRequest, entity: CmsEntity, data: Row, id?: string) {
  const field = UNIQUE_FIELD[entity]
  if (!field || data[field] === undefined) {
    return
  }
  const [existing] = await cmsOf(req)[`list${CMS_ENTITIES[entity].plural}`](
    { [field]: data[field] },
    { take: 1, select: ["id"] }
  )
  if (existing && existing.id !== id) {
    throw new MedusaError(
      MedusaError.Types.DUPLICATE_ERROR,
      `Another record already uses ${field} "${String(data[field])}".`
    )
  }
}

/** Answers 404 when the record a new or moved record points to does not exist. */
async function assertParentExists(req: MedusaRequest, entity: CmsEntity, data: Row) {
  const parent = PARENT[entity]
  if (!parent || data[parent.field] === undefined) {
    return
  }
  await cmsOf(req)[`retrieve${CMS_ENTITIES[parent.entity].singular}`](data[parent.field], {
    select: ["id"],
  })
}

export const listRecords =
  (
    entity: CmsEntity,
    options: { order?: Record<string, "ASC" | "DESC">; filterable?: string[] } = {}
  ) =>
  async (req: MedusaRequest, res: MedusaResponse) => {
    const { limit, offset } = pagination(req.query)
    const filters: Row = {}
    for (const field of options.filterable ?? []) {
      if (typeof req.query[field] === "string") {
        filters[field] = req.query[field]
      }
    }
    const [records, count] = await cmsOf(req)[
      `listAndCount${CMS_ENTITIES[entity].plural}`
    ](filters, { take: limit, skip: offset, order: options.order ?? { rank: "ASC" } })
    res.json({ [RESPONSE_KEYS[entity].many]: records, count, limit, offset })
  }

export const retrieveRecord =
  (entity: CmsEntity) => async (req: MedusaRequest, res: MedusaResponse) => {
    const record = await cmsOf(req)[`retrieve${CMS_ENTITIES[entity].singular}`](req.params.id)
    res.json({ [RESPONSE_KEYS[entity].one]: record })
  }

export const createRecord =
  (entity: CmsEntity) =>
  async (req: AuthenticatedMedusaRequest<Row>, res: MedusaResponse) => {
    await assertUnique(req, entity, req.validatedBody)
    await assertParentExists(req, entity, req.validatedBody)
    const { result } = await saveCmsRecordWorkflow(req.scope).run({
      input: { entity, data: req.validatedBody, actor_id: req.auth_context?.actor_id },
    })
    res.status(201).json({ [RESPONSE_KEYS[entity].one]: result })
  }

export const updateRecord =
  (entity: CmsEntity) =>
  async (req: AuthenticatedMedusaRequest<Row>, res: MedusaResponse) => {
    await assertUnique(req, entity, req.validatedBody, req.params.id)
    await assertParentExists(req, entity, req.validatedBody)
    const { result } = await saveCmsRecordWorkflow(req.scope).run({
      input: {
        entity,
        id: req.params.id,
        data: req.validatedBody,
        actor_id: req.auth_context?.actor_id,
      },
    })
    res.json({ [RESPONSE_KEYS[entity].one]: result })
  }

export const deleteRecord =
  (entity: CmsEntity) => async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
    await deleteCmsRecordWorkflow(req.scope).run({
      input: { entity, id: req.params.id, actor_id: req.auth_context?.actor_id },
    })
    res.json({ id: req.params.id, object: entity, deleted: true })
  }

export const reorderRecords =
  (entity: CmsEntity) =>
  async (req: AuthenticatedMedusaRequest<{ ids: string[] }>, res: MedusaResponse) => {
    const { result } = await reorderCmsRecordsWorkflow(req.scope).run({
      input: { entity, ids: req.validatedBody.ids, actor_id: req.auth_context?.actor_id },
    })
    res.json(result)
  }
