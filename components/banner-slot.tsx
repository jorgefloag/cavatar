import type { BannerDTO } from "@/lib/banners/get-banner"

export function BannerSlot({ banner }: { banner: BannerDTO | null }) {
  if (!banner) {
    return (
      <div className="mx-auto flex aspect-[4/1] w-full max-w-2xl items-center justify-center rounded-lg border border-dashed border-border">
        <span className="font-label text-xs uppercase tracking-widest text-muted-foreground">
          Espacio publicitario
        </span>
      </div>
    )
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={banner.imageUrl}
      alt="Anuncio"
      className="aspect-[4/1] w-full max-w-2xl rounded-lg object-cover"
    />
  )

  if (!banner.linkUrl) {
    return <div className="mx-auto">{image}</div>
  }

  return (
    <a
      href={banner.linkUrl}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="mx-auto block w-fit"
    >
      {image}
    </a>
  )
}
