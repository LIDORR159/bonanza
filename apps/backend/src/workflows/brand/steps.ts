import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { BRAND_MODULE } from "../../modules/brand"
import type BrandModuleService from "../../modules/brand/service"

type Row = Record<string, any>

export type SaveBrandInput = {
  id?: string
  data: {
    name?: string
    handle?: string
    logo_url?: string | null
    description?: string | null
    is_featured?: boolean
    rank?: number
  }
  actor_id?: string | null
}

export const saveBrandStep = createStep(
  "save-brand",
  async (input: SaveBrandInput, { container }) => {
    const brands: BrandModuleService = container.resolve(BRAND_MODULE)

    if (!input.id) {
      const brand = await brands.createBrands(input.data as { name: string; handle: string })
      return new StepResponse(
        { brand, created: true },
        { id: brand.id, created: true, before: null as Row | null }
      )
    }

    const before = await brands.retrieveBrand(input.id)
    const brand = await brands.updateBrands({ id: input.id, ...input.data })
    const previous = Object.fromEntries(
      Object.keys(input.data).map((key) => [key, (before as Row)[key] ?? null])
    )
    return new StepResponse(
      { brand, created: false },
      { id: input.id, created: false, before: previous as Row | null }
    )
  },
  async (undo, { container }) => {
    if (!undo) {
      return
    }
    const brands: BrandModuleService = container.resolve(BRAND_MODULE)
    if (undo.created) {
      await brands.deleteBrands(undo.id)
    } else if (undo.before) {
      await brands.updateBrands({ id: undo.id, ...undo.before })
    }
  }
)

export const deleteBrandStep = createStep(
  "delete-brand",
  async (input: { id: string }, { container }) => {
    const brands: BrandModuleService = container.resolve(BRAND_MODULE)
    const brand = await brands.retrieveBrand(input.id)
    await brands.softDeleteBrands(input.id)
    return new StepResponse(brand, input.id)
  },
  async (id, { container }) => {
    if (!id) {
      return
    }
    const brands: BrandModuleService = container.resolve(BRAND_MODULE)
    await brands.restoreBrands(id)
  }
)
