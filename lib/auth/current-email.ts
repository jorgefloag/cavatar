import { auth, currentUser } from "@clerk/nextjs/server"

export async function getCurrentUserEmail(): Promise<string | null> {
  const { userId } = await auth()
  if (!userId) return null
  const user = await currentUser()
  return user?.primaryEmailAddress?.emailAddress ?? null
}
