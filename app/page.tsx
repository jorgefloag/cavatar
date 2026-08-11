import { Hero } from "@/components/hero"
import { Explanation } from "@/components/explanation"
import { Features } from "@/components/features"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"
import { BannerSlot } from "@/components/banner-slot"
import { getActiveBanner } from "@/lib/banners/get-banner"

// Without this, Next.js has no signal that this Server Component depends on
// mutable DB state (db.select() doesn't hint dynamism the way fetch() does)
// and will happily prerender it once at build time — freezing whatever
// banner existed then. Banners need to update the moment an admin changes
// them, with no redeploy.
export const dynamic = "force-dynamic"

export default async function Home() {
  const banner = await getActiveBanner("landing")

  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <div className="px-4 py-10">
        <BannerSlot banner={banner} />
      </div>
      <Explanation />
      <Features />
      <FAQ />
      <Footer />
    </main>
  )
}
