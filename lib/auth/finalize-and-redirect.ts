import type { useRouter } from "next/navigation"

type NavigateContext = {
  session: { currentTask?: unknown }
  decorateUrl: (url: string) => string
}

type FinalizableResource = {
  finalize: (params: { navigate: (ctx: NavigateContext) => void }) => Promise<{ error: unknown }>
}

/**
 * Reemplaza el viejo `setActive({ session: result.createdSessionId })` + `router.push(...)`.
 * `finalize()` ya no expone un `createdSessionId` que extraer a mano; en vez de eso
 * recibe un callback `navigate` que Clerk invoca una vez que la sesión quedó activa.
 */
export async function finalizeAndRedirect(
  resource: FinalizableResource,
  router: ReturnType<typeof useRouter>,
  targetPath: string,
): Promise<{ error: unknown }> {
  return resource.finalize({
    navigate: ({ session, decorateUrl }) => {
      if (session.currentTask) {
        console.error("[auth] Sesión con tarea pendiente inesperada, no se redirige:", session.currentTask)
        return
      }
      const url = decorateUrl(targetPath)
      if (url.startsWith("http")) {
        window.location.href = url
      } else {
        router.push(url)
      }
    },
  })
}
