import type { MetadataRoute } from "next";
import { getProducts } from "@/app/actions/products";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://amori.kr";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getProducts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/lookbook`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => !p.isComingSoon)
    .map((p) => ({
      url: `${SITE_URL}/shop/${p.slug}`,
      lastModified: new Date(p.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  return [...staticRoutes, ...productRoutes];
}
