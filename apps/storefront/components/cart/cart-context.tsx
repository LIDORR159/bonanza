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
async function fetchCount(): Promise<number | null> {
  try {
    const response = await fetch("/api/cart", { cache: "no-store" })
    return response.ok ? ((await response.json()) as { count: number }).count : null
  } catch {
    // The badge is a convenience; the cart page is the source of truth.
    return null
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState<number | null>(null)

  const refresh = useCallback(async () => {
    const next = await fetchCount()
    if (next != null) {
      setCount(next)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchCount().then((next) => {
      if (active && next != null) {
        setCount(next)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const value = useMemo(() => ({ count, setCount, refresh }), [count, refresh])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
