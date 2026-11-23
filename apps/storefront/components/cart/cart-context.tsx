"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

type CartState = {
  /** Number of units in the cart. Null until the first answer arrives. */
  count: number | null
  setCount: (count: number) => void
  refresh: () => Promise<void>
}

const CartContext = createContext<CartState>({
  count: null,
  setCount: () => {},
  refresh: async () => {},
})

/**
 * Holds the cart badge count. It is loaded in the browser after the page
 * arrives, which keeps cookies out of page rendering: catalog pages stay
 * identical for every visitor and can be cached.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/cart", { cache: "no-store" })
      if (response.ok) {
        setCount(((await response.json()) as { count: number }).count)
      }
    } catch {
      // The badge is a convenience; the cart page is the source of truth.
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ count, setCount, refresh }), [count, refresh])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
