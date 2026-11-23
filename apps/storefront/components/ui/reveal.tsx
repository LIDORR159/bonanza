"use client"

import clsx from "clsx"
import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Fades its content up into place the first time it scrolls into view.
 * Visitors who ask for reduced motion see the content at once (globals.css
 * shortens every animation), and so does anyone without JavaScript.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle")

  useEffect(() => {
    const element = ref.current
    if (!element || !("IntersectionObserver" in window)) {
      return
    }
    // Content already on screen at load stays put: only what is below the
    // fold waits to animate in.
    if (element.getBoundingClientRect().top < window.innerHeight * 0.92) {
      return
    }
    setState("hidden")
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setState("shown")
          observer.disconnect()
        }
      },
      { rootMargin: "0px 0px -8% 0px" }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={state === "shown" ? { animationDelay: `${delay}ms` } : undefined}
      className={clsx(
        className,
        state === "hidden" && "opacity-0",
        state === "shown" && "animate-rise"
      )}
    >
      {children}
    </div>
  )
}
