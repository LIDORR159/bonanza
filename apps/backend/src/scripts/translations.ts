import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  createTranslationsWorkflow,
  updateStoresWorkflow,
  updateTranslationsWorkflow,
} from "@medusajs/medusa/core-flows"
import { TRANSLATION_LOCALES } from "../modules/cms/constants"

/**
 * Helpers the seed scripts use to load English and Arabic text.
 *
 * Content is written in Hebrew; that is what the records hold. English and
 * Arabic are stored by Medusa's Translation Module, one row per record and
 * language, and edited in the admin under Settings → Translations.
 */

type Locale = (typeof TRANSLATION_LOCALES)[number]["code"]

/** Translated values of one record's fields. Empty values are left out. */
export type Texts = Record<string, string | null | undefined>

/** English and Arabic text for one record. */
export type Translated = Partial<Record<Locale, Texts>>

/**
 * Makes English and Arabic available to translate into: the two languages are
 * registered, and offered by the store unless it already has languages of its
 * own choosing.
 */
export async function ensureTranslationLocales(container: MedusaContainer): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const translations = container.resolve(Modules.TRANSLATION)

  const codes = TRANSLATION_LOCALES.map((locale) => locale.code)
  const registered = await translations.listLocales({ code: codes }, { select: ["code"] })
  const missing = TRANSLATION_LOCALES.filter(
    (locale) => !registered.some((existing) => existing.code === locale.code)
  )
  if (missing.length) {
    await translations.createLocales(missing)
  }

  const {
    data: [store],
  } = await query.graph({
    entity: "store",
    fields: ["id", "supported_locales.locale_code"],
    pagination: { take: 1 },
  })
  if (store && !store.supported_locales?.length) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: { supported_locales: codes.map((locale_code) => ({ locale_code })) },
      },
    })
    logger.info(`Store languages set: Hebrew (the content itself), ${codes.join(", ")}.`)
  }
}

/**
 * Stores translations for records of one type. `reference` is the record
 * type's name, such as `homepage_section`. Only what is missing is written: a
 * field that already has a translation keeps it.
 */
export async function seedTranslations(
  container: MedusaContainer,
  reference: string,
  records: { id: string; translations?: Translated }[]
): Promise<number> {
  const translationModule = container.resolve(Modules.TRANSLATION)
  const withText = records.filter((record) => record.translations)
  if (!withText.length) {
    return 0
  }

  const existing = await translationModule.listTranslations(
    { reference_id: withText.map((record) => record.id) },
    { select: ["id", "reference_id", "locale_code", "translations"], take: null }
  )
  const stored = new Map(existing.map((row) => [`${row.reference_id}:${row.locale_code}`, row]))

  const toCreate: {
    reference: string
    reference_id: string
    locale_code: string
    translations: Record<string, string>
  }[] = []
  const toUpdate: { id: string; translations: Record<string, string> }[] = []

  for (const record of withText) {
    for (const { code } of TRANSLATION_LOCALES) {
      const row = stored.get(`${record.id}:${code}`)
      const current = (row?.translations ?? {}) as Record<string, string>
      const added = Object.fromEntries(
        Object.entries(record.translations?.[code] ?? {}).filter(
          (entry): entry is [string, string] =>
            typeof entry[1] === "string" && entry[1] !== "" && !current[entry[0]]
        )
      )
      if (!Object.keys(added).length) {
        continue
      }
      if (row) {
        toUpdate.push({ id: row.id, translations: { ...current, ...added } })
      } else {
        toCreate.push({ reference, reference_id: record.id, locale_code: code, translations: added })
      }
    }
  }

  if (toCreate.length) {
    await createTranslationsWorkflow(container).run({ input: { translations: toCreate } })
  }
  if (toUpdate.length) {
    await updateTranslationsWorkflow(container).run({ input: { translations: toUpdate } })
  }
  return toCreate.length + toUpdate.length
}
