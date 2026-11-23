import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { SeoFields } from "../components/seo-fields"
import { sdk } from "../lib/sdk"

const ProductSeoWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (metadata: Record<string, unknown>) =>
      sdk.admin.product.update(product.id, { metadata }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(t("bonanza.common.saved"))
    },
    onError: (error) => toast.error((error as Error).message),
  })
  return (
    <SeoFields metadata={product.metadata} saving={save.isPending} onSave={save.mutate} />
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
})

export default ProductSeoWidget
