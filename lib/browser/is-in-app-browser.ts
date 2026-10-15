// Instagram/Facebook Messenger/WhatsApp open links in an embedded WebView
// that Google blocks for OAuth with `disallowed_useragent` — rather than
// let a sender hit that error, the Google button is hidden up front for
// these user agents and only the email-code path is offered. Same
// hand-declared, UA-substring-matching style as install-prompt.tsx's
// isIOS(), not a standard DOM API.
const IN_APP_BROWSER_SIGNATURES = [
  "Instagram",
  "FBAN", // Facebook app
  "FBAV", // Facebook app (alternate marker)
  "FB_IAB", // Facebook in-app browser
  "WhatsApp",
]

export function isInAppBrowser(userAgent: string): boolean {
  return IN_APP_BROWSER_SIGNATURES.some((signature) => userAgent.includes(signature))
}
