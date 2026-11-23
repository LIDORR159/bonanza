import "server-only"
import type { HttpTypes } from "@medusajs/types"
import { privateFetch } from "./client"
import { authHeaders, getAuthToken } from "./cookies"

export type StoreCustomer = HttpTypes.StoreCustomer

/** The signed-in customer with their saved addresses, or null for a guest. */
export async function retrieveCustomer(): Promise<StoreCustomer | null> {
  if (!(await getAuthToken())) {
    return null
  }
  try {
    const { customer } = await privateFetch<{ customer: StoreCustomer }>(
      "/store/customers/me",
      {
        query: { fields: "*addresses" },
        headers: await authHeaders(),
      }
    )
    return customer
  } catch {
    // An expired or revoked token reads as signed out.
    return null
  }
}

export type StoreOrder = HttpTypes.StoreOrder

const ORDER_FIELDS = [
  "*items",
  "*items.variant",
  "*items.variant.options",
  "+items.original_total",
  "*shipping_address",
  "*billing_address",
  "*shipping_methods",
  "*payment_collections",
].join(",")

/** The signed-in customer's orders, newest first. */
export async function listOrders(
  limit = 20,
  offset = 0
): Promise<{ orders: StoreOrder[]; count: number }> {
  try {
    return await privateFetch<{ orders: StoreOrder[]; count: number }>("/store/orders", {
      query: { limit, offset, order: "-created_at", fields: ORDER_FIELDS },
      headers: await authHeaders(),
    })
  } catch {
    return { orders: [], count: 0 }
  }
}

/**
 * One order by id. Medusa serves an order to whoever knows its id, which is a
 * long random string: that is what lets a guest see their confirmation page.
 */
export async function retrieveOrder(id: string): Promise<StoreOrder | null> {
  try {
    const { order } = await privateFetch<{ order: StoreOrder }>(
      `/store/orders/${encodeURIComponent(id)}`,
      { query: { fields: ORDER_FIELDS }, headers: await authHeaders() }
    )
    return order
  } catch {
    return null
  }
}

/**
 * One of the signed-in customer's own orders, or null. The lookup goes through
 * the customer's order list, so Medusa itself decides whether the order is
 * theirs: an id belonging to someone else simply is not found.
 */
export async function retrieveCustomerOrder(id: string): Promise<StoreOrder | null> {
  try {
    const { orders } = await privateFetch<{ orders: StoreOrder[] }>("/store/orders", {
      query: { id, limit: 1, fields: ORDER_FIELDS },
      headers: await authHeaders(),
    })
    return orders[0] ?? null
  } catch {
    return null
  }
}
