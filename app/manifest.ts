import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CAVATAR",
    short_name: "CAVATAR",
    description: "Convierte cada placa vehicular en un buzón digital donde cualquier persona puede enviar un mensaje.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: "#FFFFFF",
    theme_color: "#0B1220",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
