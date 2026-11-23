import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Container, Heading, Select, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useList } from "../lib/api"
import { sdk } from "../lib/sdk"

const NONE = "none"

/** Chooses the product's brand, on the product page's side column. */
const ProductBrandWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const path = `/admin/products/${product.id}/brand`

  const brands = useList("/admin/brands", "brands", { limit: 200 })
  const current = useQuery({
    queryKey: [path],
    queryFn: () => sdk.client.fetch<{ brand: { id: string } | null }>(path),
  })
  const save = useMutation({
    mutationFn: (brandId: string | null) =>
      sdk.client.fetch(path, { method: "POST", body: { brand_id: brandId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [path] })
      toast.success(t("bonanza.common.saved"))
    },
    onError: (error) => toast.error((error as Error).message),
  })

  return (
    <Container className="flex flex-col gap-3 px-6 py-4">
      <Heading level="h2">{t("bonanza.brands.widgetTitle")}</Heading>
      <Select
        value={current.data?.brand?.id ?? NONE}
        disabled={current.isLoading || save.isPending}
        onValueChange={(value) => save.mutate(value === NONE ? null : value)}
      >
        <Select.Trigger aria-label={t("bonanza.brands.widgetTitle")}>
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value={NONE}>{t("bonanza.brands.noBrand")}</Select.Item>
          {(brands.data?.rows ?? []).map((brand) => (
            <Select.Item key={brand.id} value={brand.id}>
              {brand.name}
            </Select.Item>
          ))}
        </Select.Content>
      </Select>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side",
})

export default ProductBrandWidget
