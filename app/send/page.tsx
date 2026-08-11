import { SendForm } from "./send-form"
import { getActiveBanner } from "@/lib/banners/get-banner"

// See app/page.tsx for why this is required for admin-updated banners to work.
export const dynamic = "force-dynamic"

export default async function SendPage() {
  const banner = await getActiveBanner("send")

  return <SendForm banner={banner} />
}
