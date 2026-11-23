import { model } from "@medusajs/framework/utils"

const Brand = model
  .define("brand", {
    id: model.id({ prefix: "brand" }).primaryKey(),
    name: model.text().translatable().searchable(),
    /** URL path segment: `/brands/<handle>`. */
    handle: model.text(),
    logo_url: model.text().nullable(),
    description: model.text().translatable().nullable(),
    is_featured: model.boolean().default(false),
    rank: model.number().default(0),
  })
  .indexes([{ on: ["handle"], unique: true, where: "deleted_at IS NULL" }])

export default Brand
