/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Default is 1mb. Banner uploads (app/admin/banners/actions.ts) validate
    // images up to 2mb, but the actual multipart FormData body (boundaries +
    // the linkUrl field) is a bit larger than the file alone — 3mb leaves
    // enough headroom that a valid 2mb image doesn't get rejected at the
    // transport layer before the app-level size check even runs. Vercel's
    // own hard ceiling for Server Action uploads is 4.5mb.
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  // The password-reset link carries a one-time token in its query string.
  // Without this, clicking any outbound link from that page would leak the
  // full URL (token included) to that site via the Referer header.
  async headers() {
    return [
      {
        source: "/inbox/reset-password",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ]
  },
}

export default nextConfig
