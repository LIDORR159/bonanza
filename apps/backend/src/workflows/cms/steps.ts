import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { CMS_MODULE } from "../../modules/cms"
import { CMS_ENTITIES, type CmsEntity } from "./entities"

type Row = Record<string, any>

// The generated service methods are addressed by name, so the service is
// treated as a method map here.
type CmsMethods = Record<string, (...args: any[]) => Promise<any>>

const pick = (source: Row, keys: string[]): Row =>
  Object.fromEntries(keys.map((key) => [key, source[key] ?? null]))

export type SaveCmsRecordInput = {
  entity: CmsEntity
  /** Omit to create. */
  id?: string
  data: Row
  actor_id?: string | null
}

/**
 * Records that have a position in an ordered list, with the fields that say
 * which list a record belongs to: a service is ordered within its group, a
 * menu link within its menu and parent, a banner within its placement.
 */
const ORDERED_WITHIN: Partial<Record<CmsEntity, string[]>> = {
  homepage_section: [],
  banner: ["placement"],
  navigation_item: ["menu", "parent_id"],
  service_group: [],
  service_item: ["group_id"],
  gallery_item: [],
  team_member: [],
  review: [],
}

export const saveCmsRecordStep = createStep(
  "save-cms-record",
  async (input: SaveCmsRecordInput, { container }) => {
    const cms = container.resolve(CMS_MODULE) as unknown as CmsMethods
    const { singular, plural } = CMS_ENTITIES[input.entity]
    const data: Row = { ...input.data, updated_by: input.actor_id ?? null }

    if (!input.id) {
      if (input.entity === "content_page" && data.status === "published") {
        data.published_at = new Date()
      }
      // A new record goes to the end of its list unless a position was given.
      const siblings = ORDERED_WITHIN[input.entity]
      if (siblings && data.rank == null) {
        const sameList = Object.fromEntries(
          siblings.map((field) => [field, data[field] ?? null])
        )
        const [last] = await cms[`list${plural}`](sameList, {
          select: ["id", "rank"],
          order: { rank: "DESC" },
          take: 1,
        })
        data.rank = last ? (last.rank ?? 0) + 10 : 0
      }
      const record = await cms[`create${plural}`](data)
      return new StepResponse(
        { record, created: true },
        { entity: input.entity, id: record.id as string, created: true, before: null }
      )
    }

    const before = await cms[`retrieve${singular}`](input.id)
    if (input.entity === "content_page") {
      data.revision = (before.revision ?? 1) + 1
      if (data.status === "published" && !before.published_at) {
        data.published_at = new Date()
      }
    }
    const record = await cms[`update${plural}`]({ id: input.id, ...data })
    return new StepResponse(
      { record, created: false },
      {
        entity: input.entity,
        id: input.id,
        created: false,
        before: pick(before, Object.keys(data)) as Row | null,
      }
    )
  },
  async (undo, { container }) => {
    if (!undo) {
      return
    }
    const cms = container.resolve(CMS_MODULE) as unknown as CmsMethods
    const { plural } = CMS_ENTITIES[undo.entity]
    if (undo.created) {
      await cms[`delete${plural}`](undo.id)
    } else if (undo.before) {
      await cms[`update${plural}`]({ id: undo.id, ...undo.before })
    }
  }
)

export const deleteCmsRecordStep = createStep(
  "delete-cms-record",
  async (input: { entity: CmsEntity; id: string }, { container }) => {
    const cms = container.resolve(CMS_MODULE) as unknown as CmsMethods
    const { singular, plural } = CMS_ENTITIES[input.entity]
    const record = await cms[`retrieve${singular}`](input.id)
    await cms[`softDelete${plural}`](input.id)
    return new StepResponse(record, input)
  },
  async (input, { container }) => {
    if (!input) {
      return
    }
    const cms = container.resolve(CMS_MODULE) as unknown as CmsMethods
    await cms[`restore${CMS_ENTITIES[input.entity].plural}`](input.id)
  }
)

export const reorderCmsRecordsStep = createStep(
  "reorder-cms-records",
  async (input: { entity: CmsEntity; ids: string[] }, { container }) => {
    const cms = container.resolve(CMS_MODULE) as unknown as CmsMethods
    const { plural } = CMS_ENTITIES[input.entity]
    const current: Row[] = await cms[`list${plural}`](
      { id: input.ids },
      { select: ["id", "rank"], take: input.ids.length }
    )
    // Gaps of ten leave room to insert a record without renumbering.
    await cms[`update${plural}`](input.ids.map((id, index) => ({ id, rank: index * 10 })))
    return new StepResponse(
      { reordered: input.ids.length },
      {
        entity: input.entity,
        previous: current.map((row) => ({
          id: row.id as string,
          rank: row.rank as number,
        })),
      }
    )
  },
  async (undo, { container }) => {
    if (!undo?.previous.length) {
      return
    }
    const cms = container.resolve(CMS_MODULE) as unknown as CmsMethods
    await cms[`update${CMS_ENTITIES[undo.entity].plural}`](undo.previous)
  }
)
