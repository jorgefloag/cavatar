import type { Metadata, Viewport } from 'next'
import { Inter, Archivo, Archivo_Black } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ClerkProvider } from '@clerk/nextjs'
import { InstallPrompt } from '@/components/install-prompt'
import './globals.css'

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter"
});
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-archivo",
});
const archivoBlack = Archivo_Black({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-archivo-black",
});

export const metadata: Metadata = {
  title: 'CAVATAR - Tu placa, tu buzón digital',
  description: 'Convierte cada placa vehicular en un buzón digital donde cualquier persona puede enviar un mensaje.',
  generator: 'v0.app',
  icons: {
    icon: '/favicon.png',
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'CAVATAR',
    // 'default' keeps the status bar opaque instead of overlaying page
    // content — the app has a white background and no safe-area-inset
    // handling today, so 'black-translucent' would risk content rendering
    // under the status bar.
    statusBarStyle: 'default',
  },
}

// themeColor lives on Viewport, not Metadata — metadata.themeColor is
// deprecated in favor of this separate export.
export const viewport: Viewport = {
  themeColor: '#0B1220',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider>
      <html lang="es" className="bg-background">
        <body className={`${inter.variable} ${archivo.variable} ${archivoBlack.variable} font-sans antialiased bg-background text-foreground`}>
          {children}
          <InstallPrompt />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
