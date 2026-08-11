import { InboxContent } from "./inbox-content"
import { getActiveBanner } from "@/lib/banners/get-banner"

// See app/page.tsx for why this is required for admin-updated banners to work.
export const dynamic = "force-dynamic"

export default async function InboxPage() {
  const banner = await getActiveBanner("inbox")

  return <InboxContent banner={banner} />
}
