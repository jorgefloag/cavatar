import { fetchAllVerifiedRequests } from "./actions"
import { VerifiedTable } from "./verified-table"

export default async function AdminVerifiedPage() {
  const requests = await fetchAllVerifiedRequests()
  return (
    <div>
      <h1 className="mb-8 font-mono text-2xl font-bold tracking-wide text-foreground md:text-3xl">
        Perfiles verificados
      </h1>
      <VerifiedTable initialRequests={requests} />
    </div>
  )
}
