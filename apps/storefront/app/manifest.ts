import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BONANZA — Barbershop & Academy",
    short_name: "BONANZA",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    display: "browser",
    background_color: "#0b0c0d",
    theme_color: "#0b0c0d",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  }
}
