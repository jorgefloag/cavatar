import { Hero } from "@/components/hero"
import { Explanation } from "@/components/explanation"
import { Features } from "@/components/features"
import { FAQ } from "@/components/faq"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Hero />
      <Explanation />
      <Features />
      <FAQ />
      <Footer />
    </main>
  )
}
