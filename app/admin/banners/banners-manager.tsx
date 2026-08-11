"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  removeBanner,
  toggleBannerActive,
  updateBannerLink,
  uploadBanner,
  type BannerAdminDTO,
} from "./actions"

function BannerCard({ banner, onChange }: { banner: BannerAdminDTO; onChange: (patch: Partial<BannerAdminDTO>) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [linkDraft, setLinkDraft] = useState(banner.linkUrl ?? "")
  const [isUploading, setIsUploading] = useState(false)
  const [isSavingLink, setIsSavingLink] = useState(false)
  const [message, setMessage] = useState("")

  const handleUpload = async () => {
    if (!file) return
    setIsUploading(true)
    setMessage("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("linkUrl", linkDraft)

    const result = await uploadBanner(banner.location, formData)
    setIsUploading(false)

    if (!result.success) {
      setMessage(result.error || "Error al subir la imagen.")
      return
    }

    setFile(null)
    onChange({ imageUrl: result.imageUrl, linkUrl: linkDraft.trim() || null, isActive: true })
    setMessage("Imagen subida correctamente.")
  }

  const handleSaveLink = async () => {
    setIsSavingLink(true)
    setMessage("")
    const result = await updateBannerLink(banner.location, linkDraft)
    setIsSavingLink(false)

    if (!result.success) {
      setMessage(result.error || "Error al guardar el link.")
      return
    }
    onChange({ linkUrl: linkDraft.trim() || null })
    setMessage("Link actualizado.")
  }

  const handleToggleActive = async (checked: boolean) => {
    const result = await toggleBannerActive(banner.location, checked)
    if (!result.success) {
      setMessage(result.error || "Error al actualizar el banner.")
      return
    }
    onChange({ isActive: checked })
  }

  const handleRemove = async () => {
    const result = await removeBanner(banner.location)
    if (!result.success) {
      setMessage(result.error || "Error al quitar el banner.")
      return
    }
    setLinkDraft("")
    onChange({ imageUrl: null, linkUrl: null, isActive: false })
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-label text-sm uppercase tracking-wide text-foreground">{banner.locationLabel}</h2>
        {banner.imageUrl && (
          <div className="flex items-center gap-2">
            <Label htmlFor={`active-${banner.location}`} className="text-xs text-muted-foreground">
              Activo
            </Label>
            <Switch
              id={`active-${banner.location}`}
              checked={banner.isActive}
              onCheckedChange={handleToggleActive}
            />
          </div>
        )}
      </div>

      {banner.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={banner.imageUrl}
          alt={`Banner de ${banner.locationLabel}`}
          className="mb-4 aspect-[4/1] w-full rounded-md border border-border object-cover"
        />
      ) : (
        <div className="mb-4 flex aspect-[4/1] w-full items-center justify-center rounded-md border border-dashed border-border">
          <span className="text-xs text-muted-foreground">Sin imagen</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div>
          <Label htmlFor={`file-${banner.location}`} className="mb-1.5 block text-xs text-muted-foreground">
            {banner.imageUrl ? "Reemplazar imagen" : "Subir imagen"} (JPEG/PNG/WebP, máx. 2 MB, 800×200px recomendado)
          </Label>
          <div className="flex gap-2">
            <Input
              id={`file-${banner.location}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="h-10 text-sm"
            />
            <Button size="sm" onClick={handleUpload} disabled={!file || isUploading}>
              {isUploading ? "Subiendo..." : "Subir"}
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor={`link-${banner.location}`} className="mb-1.5 block text-xs text-muted-foreground">
            Link de destino (opcional)
          </Label>
          <div className="flex gap-2">
            <Input
              id={`link-${banner.location}`}
              type="url"
              placeholder="https://..."
              value={linkDraft}
              onChange={(e) => setLinkDraft(e.target.value)}
              className="h-10 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveLink}
              disabled={isSavingLink || !banner.imageUrl}
            >
              {isSavingLink ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>

        {message && <p className="text-xs text-muted-foreground">{message}</p>}

        {banner.imageUrl && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" className="self-start">
                Quitar banner
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Quitar este banner?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se borra la imagen y el link para {banner.locationLabel}. El espacio vuelve a mostrar el
                  placeholder hasta que subas una imagen nueva.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemove}>Quitar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

export function BannersManager({ initialBanners }: { initialBanners: BannerAdminDTO[] }) {
  const [bannersState, setBannersState] = useState(initialBanners)

  const patchBanner = (location: BannerAdminDTO["location"], patch: Partial<BannerAdminDTO>) => {
    setBannersState((prev) => prev.map((b) => (b.location === location ? { ...b, ...patch } : b)))
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {bannersState.map((banner) => (
        <BannerCard key={banner.location} banner={banner} onChange={(patch) => patchBanner(banner.location, patch)} />
      ))}
    </div>
  )
}
