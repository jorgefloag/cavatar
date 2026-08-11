import { fetchBanners } from "./actions"
import { BannersManager } from "./banners-manager"

export default async function AdminBannersPage() {
  const banners = await fetchBanners()

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">Banners</h1>
      <BannersManager initialBanners={banners} />
    </div>
  )
}
