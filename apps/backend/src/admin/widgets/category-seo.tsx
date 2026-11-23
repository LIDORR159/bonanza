import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProductCategory, DetailWidgetProps } from "@medusajs/framework/types"
import { toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { SeoFields } from "../components/seo-fields"
import { sdk } from "../lib/sdk"

const CategorySeoWidget = ({ data: category }: DetailWidgetProps<AdminProductCategory>) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (metadata: Record<string, unknown>) =>
      sdk.admin.productCategory.update(category.id, { metadata }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["product_categories"] })
      toast.success(t("bonanza.common.saved"))
    },
    onError: (error) => toast.error((error as Error).message),
  })
  return (
    <SeoFields metadata={category.metadata} saving={save.isPending} onSave={save.mutate} />
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details",
})

export default CategorySeoWidget
