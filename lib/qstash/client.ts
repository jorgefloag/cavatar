import { Client, Receiver } from "@upstash/qstash"

export const qstash = new Client({ token: process.env.QSTASH_TOKEN })

// Verifies the `Upstash-Signature` header on incoming callbacks — QStash's
// own request-signing mechanism, the equivalent of the CRON_SECRET bearer
// check on the Vercel Cron route, but native to how QStash authenticates.
export const qstashReceiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? "",
})

export function notifyOwnerWebhookUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/qstash/notify-owner`
}
