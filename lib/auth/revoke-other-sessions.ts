"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"

/**
 * Cierra todas las sesiones activas del usuario actual salvo la que hizo esta
 * misma petición. No acepta ningún ID desde el cliente a propósito: userId y
 * sessionId se leen de auth() (la cookie de la sesión que llama), no de un
 * argumento — así no se puede invocar para revocar sesiones de otra persona.
 */
export async function revokeOtherSessions(): Promise<{ success: boolean; error?: string }> {
  const { userId, sessionId } = await auth()
  if (!userId || !sessionId) {
    return { success: false, error: "No hay sesión activa." }
  }

  try {
    const client = await clerkClient()
    const { data: sessions } = await client.sessions.getSessionList({ userId, status: "active" })

    await Promise.all(
      sessions.filter((session) => session.id !== sessionId).map((session) => client.sessions.revokeSession(session.id)),
    )

    return { success: true }
  } catch (error) {
    console.error("[auth] revokeOtherSessions error:", error)
    return { success: false, error: "No se pudieron cerrar las otras sesiones." }
  }
}
