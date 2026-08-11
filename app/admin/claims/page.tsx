import { fetchAllClaims } from "./actions"
import { ClaimsTable } from "./claims-table"

export default async function AdminClaimsPage() {
  const claims = await fetchAllClaims()
  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-foreground md:text-3xl">
        Reclamos de placa
      </h1>
      <ClaimsTable initialClaims={claims} />
    </div>
  )
}
