"use client"

import { useEffect } from "react"

/**
 * Register the service worker and handle PWA install lifecycle.
 * Renders nothing — just runs side-effects.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return

    navigator.serviceWorker.register("/tile-sw.js").catch(() => {
      // SW registration failed — ignore (e.g. localhost without HTTPS)
    })
  }, [])

  return null
}
