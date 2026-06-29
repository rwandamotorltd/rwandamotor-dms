import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rwandamotor CSSR",
    short_name: "CSSR",
    description: "Customer Service & Sales Retention Platform — Rwanda Multi-Brand Automotive DMS",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#3b82f6",
    orientation: "any",
    categories: ["business", "productivity"],
    icons: [
      { src: "/api/pwa/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/api/pwa/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/api/pwa/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    screenshots: [],
  };
}
