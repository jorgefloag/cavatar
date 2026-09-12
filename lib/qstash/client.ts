import { Client, Receiver } from "@upstash/qstash"

// QStash runs two independent regions (EU and US) with separate credentials
// — a token issued for one 404s ("user not found in this region") against
// the other's endpoint. The Client reads QSTASH_URL from the environment
// automatically if set; without it, it defaults to the EU endpoint
// (qstash.upstash.io), which is wrong for a US-region project.
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

// Vercel's Deployment Protection (on by default for Preview deployments)
// 401s every request that isn't authenticated via Vercel SSO — including
// QStash's own callback, before our route code ever runs. Vercel's
// documented workaround is to send this header with a matching secret
// (Project Settings → Deployment Protection → Protection Bypass for
// Automation) rather than disabling protection outright. Harmless to
// include unconditionally: Production typically has no protection to
// bypass, and an unset/undefined secret here just sends nothing extra.
export function qstashPublishHeaders(): Record<string, string> {
  const secret = process.env.VERCEL_PROTECTION_BYPASS_SECRET
  return secret ? { "x-vercel-protection-bypass": secret } : {}
}
