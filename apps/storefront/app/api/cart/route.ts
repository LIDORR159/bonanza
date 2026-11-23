import { NextResponse } from "next/server"
import { cartItemCount, retrieveCart } from "@/lib/medusa/cart-data"

export const dynamic = "force-dynamic"

/** The number of units in the visitor's cart, for the header badge. */
export async function GET() {
  const cart = await retrieveCart("id,items.quantity,completed_at")
  return NextResponse.json(
    { count: cartItemCount(cart) },
    { headers: { "Cache-Control": "private, no-store" } }
  )
}
