import { MedusaContainer } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * The store's base setup. Runs once per database, in every environment, as
 * part of `medusa db:migrate`.
 *
 * It creates the structure every environment needs: sales channel, publishable
 * key, the store, the Israel region in ILS with tax-inclusive prices, the VAT
 * region, a stock location and its delivery and pickup zones.
 *
 * It creates no products, no shipping options and no shipping prices. Those
 * are business decisions: demo values come from `src/scripts/seed-demo.ts`
 * in development, and the real ones are entered in the admin for production.
 */
export default async function initialDataSeed({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentModuleService = container.resolve(ModuleRegistrationName.FULFILLMENT)

  logger.info("Creating the BONANZA store setup...")

  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        { name: "BONANZA Online Store", description: "The public storefront." },
      ],
    },
  })

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Storefront", type: "publishable", created_by: "" }],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: publishableApiKey.id, add: [salesChannel.id] },
  })

  // Israeli consumer law requires shelf prices to include VAT, so prices are
  // entered and stored tax-inclusive.
  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "ישראל",
          currency_code: "ils",
          countries: ["il"],
          is_tax_inclusive: true,
          automatic_taxes: true,
          // No payment provider yet. The development provider is attached by
          // the demo seed; a real one is attached when it is integrated.
          payment_providers: [],
        },
      ],
    },
  })

  await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "BONANZA",
          supported_currencies: [
            { currency_code: "ils", is_default: true, is_tax_inclusive: true },
          ],
          default_sales_channel_id: salesChannel.id,
          default_region_id: region.id,
        },
      ],
    },
  })

  // VAT is 18% (since January 2025). Verify with an accountant before launch;
  // the rate is editable in the admin under Settings → Tax Regions.
  await createTaxRegionsWorkflow(container).run({
    input: [
      {
        country_code: "il",
        provider_id: "tp_system",
        default_tax_rate: { rate: 18, name: "מע״מ", code: "VAT" },
      },
    ],
  })

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: "מחסן ראשי",
          address: { address_1: "", city: "", country_code: "IL" },
        },
      ],
    },
  })

  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  const deliverySet = await fulfillmentModuleService.createFulfillmentSets({
    name: "משלוחים בישראל",
    type: "shipping",
    service_zones: [
      { name: "ישראל", geo_zones: [{ country_code: "il", type: "country" }] },
    ],
  })

  const pickupSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "איסוף עצמי",
    type: "pickup",
    service_zones: [
      { name: "איסוף מהחנות", geo_zones: [{ country_code: "il", type: "country" }] },
    ],
  })

  await link.create([
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: deliverySet.id },
    },
    {
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: { fulfillment_set_id: pickupSet.id },
    },
  ])

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  })

  logger.info("BONANZA store setup created.")
}
