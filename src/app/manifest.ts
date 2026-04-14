import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Family Gallery",
    short_name: "Family Gallery",
    description: "Private family photos, personal galleries, and shared albums.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#4f46e5",
    icons: [
      {
        src: "/pwa-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/pwa-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
