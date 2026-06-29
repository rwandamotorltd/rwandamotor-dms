import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

type PwaOrientation = "portrait" | "landscape" | "any";

async function fetchOrientation(): Promise<PwaOrientation> {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";
    const res = await fetch(`${base}/pwa/orientation`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const val = json?.data as string;
      if (val === "landscape" || val === "any") return val;
    }
  } catch { /* fall through to default */ }
  return "portrait";
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const orientation = await fetchOrientation();

  return {
    name: "Rwandamotor CSSR",
    short_name: "CSSR",
    description: "Customer Service & Sales Retention Platform — Rwanda Multi-Brand Automotive DMS",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#3b82f6",
    orientation,
    categories: ["business", "productivity"],
    icons: [
      { src: "/api/pwa/icon-192", sizes: "192x192", type: "image/png" },
      { src: "/api/pwa/icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/api/pwa/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
    screenshots: [],
  };
}
