"use server"

import { put, del } from "@vercel/blob"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { banners } from "@/lib/db/schema"
import { requireAdminEmail } from "@/lib/auth/require-admin"
import type { BannerLocation } from "@/lib/banners/get-banner"

const LOCATIONS: BannerLocation[] = ["landing", "send", "inbox"]
const LOCATION_LABELS: Record<BannerLocation, string> = {
  landing: "Landing",
  send: "Enviar mensaje",
  inbox: "Buzón",
}

const MAX_FILE_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export interface BannerAdminDTO {
  location: BannerLocation
  locationLabel: string
  imageUrl: string | null
  linkUrl: string | null
  isActive: boolean
  updatedAt: string | null
}

export async function fetchBanners(): Promise<BannerAdminDTO[]> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return []

  const rows = await db.select().from(banners)
  const byLocation = new Map(rows.map((row) => [row.location, row]))

  return LOCATIONS.map((location) => {
    const row = byLocation.get(location)
    return {
      location,
      locationLabel: LOCATION_LABELS[location],
      imageUrl: row?.imageUrl ?? null,
      linkUrl: row?.linkUrl ?? null,
      isActive: row?.isActive ?? false,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    }
  })
}

export async function uploadBanner(
  location: BannerLocation,
  formData: FormData,
): Promise<{ success: boolean; error?: string; imageUrl?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  if (!LOCATIONS.includes(location)) {
    return { success: false, error: "Ubicación inválida." }
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Selecciona una imagen." }
  }

  const extension = ALLOWED_TYPES[file.type]
  if (!extension) {
    return { success: false, error: "Formato no soportado. Usa JPEG, PNG o WebP." }
  }

  if (file.size > MAX_FILE_BYTES) {
    return { success: false, error: "La imagen no puede pesar más de 2 MB." }
  }

  const linkUrlRaw = formData.get("linkUrl")
  const linkUrl = typeof linkUrlRaw === "string" && linkUrlRaw.trim() ? linkUrlRaw.trim() : null

  try {
    const [existing] = await db.select().from(banners).where(eq(banners.location, location)).limit(1)

    const blob = await put(`banners/${location}-${Date.now()}.${extension}`, file, {
      access: "public",
      addRandomSuffix: true,
    })

    await db
      .insert(banners)
      .values({ location, imageUrl: blob.url, linkUrl, isActive: true })
      .onConflictDoUpdate({
        target: banners.location,
        set: { imageUrl: blob.url, linkUrl, isActive: true, updatedAt: new Date() },
      })

    if (existing?.imageUrl) {
      await del(existing.imageUrl).catch((error) => {
        console.error("[admin/banners] Failed to delete old blob:", error)
      })
    }

    return { success: true, imageUrl: blob.url }
  } catch (error) {
    console.error("[admin/banners] uploadBanner error:", error)
    return { success: false, error: "Error al subir la imagen." }
  }
}

export async function updateBannerLink(
  location: BannerLocation,
  linkUrl: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [result] = await db
      .update(banners)
      .set({ linkUrl: linkUrl.trim() || null, updatedAt: new Date() })
      .where(eq(banners.location, location))
      .returning({ id: banners.id })

    if (!result) return { success: false, error: "Este espacio todavía no tiene una imagen subida." }
    return { success: true }
  } catch (error) {
    console.error("[admin/banners] updateBannerLink error:", error)
    return { success: false, error: "Error al guardar el link." }
  }
}

export async function toggleBannerActive(
  location: BannerLocation,
  isActive: boolean,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [result] = await db
      .update(banners)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(banners.location, location))
      .returning({ id: banners.id })

    if (!result) return { success: false, error: "Este espacio todavía no tiene una imagen subida." }
    return { success: true }
  } catch (error) {
    console.error("[admin/banners] toggleBannerActive error:", error)
    return { success: false, error: "Error al actualizar el banner." }
  }
}

export async function removeBanner(location: BannerLocation): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdminEmail()
  if (!admin.ok) return { success: false, error: "No autorizado" }

  try {
    const [existing] = await db.select().from(banners).where(eq(banners.location, location)).limit(1)
    if (!existing) return { success: false, error: "Este espacio ya está vacío." }

    await db.delete(banners).where(eq(banners.location, location))

    await del(existing.imageUrl).catch((error) => {
      console.error("[admin/banners] Failed to delete blob on removal:", error)
    })

    return { success: true }
  } catch (error) {
    console.error("[admin/banners] removeBanner error:", error)
    return { success: false, error: "Error al quitar el banner." }
  }
}
