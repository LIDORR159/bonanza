import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "@medusajs/ui"
import { sdk } from "./sdk"

/**
 * Data access for the custom admin screens: thin TanStack Query wrappers over
 * the `/admin/cms/*` and `/admin/brands` routes.
 */

export type Row = Record<string, any> & { id: string }

type ListResponse = Record<string, unknown> & { count?: number }

const errorText = (error: unknown) =>
  (error as { message?: string })?.message || "Something went wrong"

/** `GET <path>` returning `{ [key]: Row[] }`. */
export function useList(path: string, key: string, query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [path, query],
    queryFn: async () => {
      const response = await sdk.client.fetch<ListResponse>(path, { query })
      return { rows: (response[key] ?? []) as Row[], count: response.count ?? 0 }
    },
  })
}

/** Creates (no id) or updates (id) a record, then refreshes the list. */
export function useSave(path: string, successMessage: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Record<string, unknown> }) =>
      sdk.client.fetch(id ? `${path}/${id}` : path, { method: "POST", body: data }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [path] })
      toast.success(successMessage)
    },
    onError: (error) => toast.error(errorText(error)),
  })
}

export function useRemove(path: string, successMessage: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => sdk.client.fetch(`${path}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [path] })
      toast.success(successMessage)
    },
    onError: (error) => toast.error(errorText(error)),
  })
}

/** Saves a new display order. `orderPath` is the matching `*-order` route. */
export function useReorder(listPath: string, orderPath: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      sdk.client.fetch(orderPath, { method: "POST", body: { ids } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [listPath] }),
    onError: (error) => toast.error(errorText(error)),
  })
}

/** Uploads one image through Medusa's upload route and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const { files } = await sdk.admin.upload.create({ files: [file] })
  const url = files[0]?.url
  if (!url) {
    throw new Error("Upload failed")
  }
  return url
}

/** Removes empty strings so optional fields are stored as null, not "". */
export function clean<T extends Record<string, unknown>>(values: T): T {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === "" ? null : value])
  ) as T
}
