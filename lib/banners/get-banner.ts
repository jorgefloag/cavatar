import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { banners } from "@/lib/db/schema"

export type BannerLocation = "landing" | "send" | "inbox"

export interface BannerDTO {
  imageUrl: string
  linkUrl: string | null
}

export async function getActiveBanner(location: BannerLocation): Promise<BannerDTO | null> {
  const [row] = await db
    .select({ imageUrl: banners.imageUrl, linkUrl: banners.linkUrl })
    .from(banners)
    .where(and(eq(banners.location, location), eq(banners.isActive, true)))
    .limit(1)

  return row ?? null
}
